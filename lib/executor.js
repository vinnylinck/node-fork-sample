/* jslint node:true */
// ****************************** GLOBAL DEFINITIONS  ******************************
var HashMap = require("hashmap");

var logger_factory = require("./logging/logger-factory");
var format_helper = require("./helpers/format-helper.js");
var Job = require("./job");
var States = require("./jobs/job-states");
var CustomEvents = require("./jobs/job-events");





// ****************************** EXECUTOR  ******************************
var pipeline = [];
var logger, hook, processState, checkForStarving, wakeUp, dispose;


dispose = function (id) {
	// disposing job
	delete pipeline[id];
};

processState = function (id, state) {
	switch (state) {

		case States.UNDEFINED:
		case States.LOADED:
			logger.debug(id, " is not running (yet). State: ", state);
			break;

		case States.STARTED:
		case States.CONNECTING:
			logger.info(id, " changed his state to ", state);
			break;

		case States.FAILED:
			logger.error(id, " has failed!");
			pipeline[id].fail();
			break;

		default:
			logger.warn("Unknown state ", state, " received from ", id);
			break;
	}
};


wakeUp = function (name, deps) {

	// handling "no-dependency" scenario
	if (deps.length === 0) {
		logger.info("No dependency. Sending START command...");
		pipeline[name].start();
	}
};


/**
 * Check for starving jobs, looping through dependencies
 * 
 */
checkForStarving = function () {
	var deps = [];

	// looping through object attributes
	format_helper.loopObject(pipeline, function (name, job) {
		logger.info("Checking dependencies for ", name);

		// getting dependencies
		deps = format_helper.toArray(job.dependencies);
		logger.info(name, " has ", deps.length, " dependencies.");

		// handling dependencies
		wakeUp(name, deps);
	});
};


exports.setUpdateHook = function (cb) {
	hook = cb;
};

exports.onJobUpdate = function (id, event, args, clear) {
	switch (event) {

		// Job changes
		case CustomEvents.ON_JOB_CHANGE:

			// updating screen
			hook(id, args.progress, args.details, clear);

			// taking decisions on job change
			processState(id, args.current_state);
			break;

		// Job has been killed!
		case CustomEvents.ON_JOB_KILL:
			logger.warn(id, " has been killed with exit code ", args.code);

			if (args.signal) {
				logger.debug("SIGNAL: ", args.signal);
			}

			dispose(id);		
			break;

		default:
			logger.warn("Unknown event ", event, " received from ", id, " with args ", args);
			break;			
	}
};


/**
 * Create job
 *
 * @param {object} jobdef job definition
 * @return {object} job instance
 * 
 */
exports.create = function (jobdef) {
	// forking job
	var job = new Job(jobdef);
	job.onchange = this.onJobUpdate;

	logger.info("Job ", job.name, " has been forked!");

	return job;
};



/**
 * Load jobs into pipeline
 *
 * @param {object} jobdef job definition
 * @param {object} options loading options
 * 
 */
exports.pipe = function (jobdef, options) {
	var job = this.create(jobdef);

	// loading job
	logger.debug("Loading to pipe job ", jobdef.name, " with settings ", options);

	pipeline[job.name] = job;
	pipeline[job.name].load(options);
};




/**
 * Runs a list of jobs
 *
 * @param {array} jobs args list of jobs
 * @param {object} options loading options
 * @param {object} parentLogger	base logger instance used to create child loggers.
 * 
 */
exports.run = function (jobs, options, parentLogger) {

	// creating logger when needed
	if (!logger && parentLogger) {
		logger = logger_factory.getLogger("executor.js", parentLogger);
	}

	// assuring array format
	var joblist = format_helper.toArray(jobs);
	var self = this;


	logger.info("Running jobs ", joblist);

	// "piping" jobs
	joblist.forEach(function (job) {
		self.pipe(job, options);
	});

	// checking starvation list
	checkForStarving();
};





module.exports = exports;
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
var logger, hook, processState, checkForStarving;


processState = function (id, state) {
	switch (state) {

		case States.UNDEFINED:
			logger.debug(id, " is still loading...");
			break;

		case States.LOADED:
			logger.info("Starting ", id);
			pipeline[id].start();
			break;

		case States.AWAITING_OK:
			logger.info("Asking for dependencies...");
			pipeline[id].retrieveDependencies();
			break;

		default:
			logger.warn("Unknown state ", state, " received from ", id);
			break;
	}
};


checkForStarving = function (id, dependencies) {
	var total_finished  = 0;
	var hasFailed = false;

	dependencies.forEach(function (blocker) {
		console.log(blocker);
	});

	// checking dependencies
	if (hasFailed) {
		console.log("FALHOU!");

	// checking success
	} else if (total_finished === dependencies.length) {
		logger.debug("Resuming ", id);
		pipeline[id].resume();

	// checking dependency pipeline
	} else {
		console.log("Aguarda");
	}
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

		// Answering dependency check
		case CustomEvents.ON_JOB_ASKDEP:

			// logging dependencies
			logger.info("Dependencies retrieved for ", id);
			logger.debug("Dependency list: ", args);

			// check for starvation
			checkForStarving(id, args);
			break;

		default:
			logger.warn("Unknown event ", event, " received from ", id, " with args ", args);
			break;			
	}
};

exports.create = function (name) {
	// forking job
	var job = new Job(name);
	job.onchange = this.onJobUpdate;

	logger.info("Job ", name, " has been forked!");

	return job;
};

exports.pipe = function (name, options) {
	var job = this.create(name);

	// loading job
	logger.debug("Loading to pipe job ", name, " with settings ", options);

	job.load(options);
	pipeline[job.name] = job;
};

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
	joblist.forEach(function (name) {
		self.pipe(name, options);
	});
};

module.exports = exports;
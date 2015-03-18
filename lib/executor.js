/* jslint node:true */
// ****************************** GLOBAL DEFINITIONS  ******************************
var HashMap = require("hashmap");

var logger_factory = require("./logging/logger-factory");
var format_helper = require("./helpers/format-helper.js");
var Job = require("./job");
var CustomEvents = require("./jobs/job-events");





// ****************************** EXECUTOR  ******************************
var pipeline = new HashMap();
var logger, hook;



exports.setUpdateHook = function (cb) {
	hook = cb;
};

exports.onJobUpdate = function (id, event, args) {
	switch (event) {

		case CustomEvents.ON_JOB_CHANGE:
			hook(id, args.progress, args.details);
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
	pipeline.set(job.name, job);
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
/* jslint node:true */
var format_helper = require("./helpers/format-helper.js");
var Job = require("./job");
var HashMap = require("hashmap");
var pipeline;



exports.onStatusUpdate = null;

exports.onJobUpdate = function (id, event, args) {
	console.log(arguments);
};

exports.create = function (name) {
	// forking job
	var job = new Job(name);
	job.onchange = this.onJobUpdate;

	return job;
};

exports.pipe = function (name) {
	var job = this.create(name);

	// checking pipeline
	if (!pipeline) {
		//pipeline.put()
	}

	console.log(job.name);
};

exports.run = function (jobs) {
	// assuring array format
	var joblist = format_helper.toArray(jobs);

	// adding to pipeline
	var self = this;

	joblist.forEach(function (name) {
		self.pipe(name);
	});
};

module.exports = exports;
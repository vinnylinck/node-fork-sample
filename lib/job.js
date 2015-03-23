/* jslint node:true */
var commands = require("./jobs/job-commands");
var CustomEvents = require("./jobs/job-events");

var format_helper = require("./helpers/format-helper.js");
var fork = require("child_process").fork;




function Job(definition) {
	this.name = definition.name;
	this.dependencies = definition.dependencies;
	this.worker = null;
	this.finished = false;
	this.failed = false;
	this.exitCode;
	this.exitSignal;
};



Job.prototype.onchange = function (){};



Job.prototype.load = function (options) {
	var self = this;

	if (!this.worker) {

		// forking worker
		this.worker = fork("./lib/jobs/job-engine", [this.name, JSON.stringify(options)]);

		// handling error event
		this.worker.on('error', function (err) {
			self.onError(err);
		});

		// handling exit event
		this.worker.on('exit', function (code, signal) {
			self.onExit(code, signal);
		});

		// handling close event
		this.worker.on('close', function (code, signal) {
			self.onClose(code, signal);
		});

		// handling disconnect event
		this.worker.on('disconnect', function () {
			self.onDisconnect(arguments);
		});

		// handling message events
		this.worker.on('message', function (m) {
			self.onMessage(m);
		});
	}
};


Job.prototype.onError =  function (err) {
	console.log("Error ", err);
};


Job.prototype.onJobProcessExit = function (code, signal, event) {
	var status = {};

	this.exitCode = code;
	this.exitSignal = signal;

	if (!this.failed) {
		this.failed = (code === 0 ? false : true);
		this.finished = true;
	}

	status = {
		"code" : code,
		"signal": signal
	};

	this.onchange(this.name, event, status, false);	
};


Job.prototype.onExit =  function (code, signal) {
	this.onJobProcessExit(code, signal, CustomEvents.ON_JOB_KILL);
};

Job.prototype.onClose =  function (code, signal) {
	this.onJobProcessExit(code, signal, CustomEvents.ON_JOB_CLOSE);
};

Job.prototype.onDisconnect =  function () {
	this.onchange(this.name, CustomEvents.ON_JOB_DISCONNECT, arguments, false);	
};


Job.prototype.onMessage =  function (m) {

	// unpacking message
	var unpacked = format_helper.deserialize(m);

	// informing executor
	this.onchange(unpacked.id, unpacked.event, unpacked.status, unpacked.clear);
};


Job.prototype.start = function () {
	this.worker.send(commands.START);
};

Job.prototype.fail = function () {
	this.failed = true;
	this.worker.send(commands.KILL);
};

Job.prototype.resume = function (event) {
	this.worker.send(commands.RESUME);	
};

module.exports = Job;
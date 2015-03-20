/* jslint node:true */
var commands = require("./jobs/job-commands");
var format_helper = require("./helpers/format-helper.js");
var fork = require("child_process").fork;



function Job(definition) {
	this.name = definition.name;
	this.dependencies = definition.dependencies;
	this.worker = null;
	this.finished = false;
	this.failed = false;

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
	//console.log("Error ", err);
};

Job.prototype.onExit =  function (code, signal) {
	//console.log("Exit ",code, " # ", signal);
};

Job.prototype.onClose =  function (code, signal) {
	//console.log("Close ", code, " # ", signal);
};

Job.prototype.onDisconnect =  function () {
	//console.log("Disconnect ", arguments);
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

module.exports = Job;
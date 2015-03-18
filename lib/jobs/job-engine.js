/* jslint node:true */
// ****************************** GLOBAL DEFINITIONS  ******************************
var engine = require("automata");
var logger_factory = require("../logging/logger-factory");
var States = require("./job-states");
var CustomEvents = require("./job-events");
var format_helper = require("../helpers/format-helper.js");


// ****************************** WORKER  ******************************
var name, 
	settings, 
	logger, 
	job, 
	current_state,
	progress = 0;



/**
* send message
*/
exports.sendMessage = function (msg) {
	var packed;

	logger.debug("Sending message: ", msg);

	// packing stuff
	packed = format_helper.serialize(msg);

	// sending
	process.send(packed);
};


/**
* Format progress status to be sent
*/
exports.sendProgressStatus = function (label) {
	var msg = {
		"id": name,
		"event": CustomEvents.ON_JOB_CHANGE,
		"status": {
			"progress": progress,
			"state": current_state,
			"details": label || ""
		}
	};

	this.sendMessage(msg);
};

/**
* Change job state
*/
exports.changeState = function (status, msg) {
	logger.info("State changed from ", current_state, " to ", status);
	current_state = status;
	this.sendProgressStatus();
};


/**
* Loads job
*/
exports.load = function () {

	try {
		job = require("./" + name);
	
		logger.debug(job);
		logger.info(name, " has been initialized successfully!");

		this.changeState(States.LOADED);

	} catch (err) {
		logger.error(err);
		// ???
	}
};


/**
* initialize job
*/
exports.init = function () {
	// parsing args
	name = process.argv[2];
	settings = JSON.parse(process.argv[3]);
	
	// initializing logs
	logger = logger_factory.getLogger(name + ".js", null, settings.logging);	

	// setting initial state
	this.changeState(States.UNDEFINED);

	// loading engine
	this.load();
};


// ****************************** INIT  ******************************
this.init();
module.exports = exports;
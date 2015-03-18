/* jslint node:true */
// ****************************** GLOBAL DEFINITIONS  ******************************
var engine = require("automata");

var format_helper = require("../helpers/format-helper.js");
var logger_factory = require("../logging/logger-factory");

var States = require("./job-states");
var CustomEvents = require("./job-events");

// ****************************** TASK  ******************************
function Task(name, parentLogger) {
	this.name = name;
	this.logger = logger_factory.getLogger("task.js", parentLogger);
	this.status = {
		"current_state": States.UNDEFINED,
		"progress": 0
	};
	this.raw = null;
	this.machine = null;
}


/**
* initialize raw task
*/
Task.prototype.configure = function () {
};

/**
* Loads job
*/
Task.prototype.load = function () {
	try {
		this.raw = require("./tasks/" + this.name);
	
		this.logger.debug(this.raw);
		this.logger.info(this.name, " has been initialized successfully!");

		this.changeState(States.LOADED, " has been created sucessfully!");

	} catch (err) {
		this.logger.error(err);
	}
};

/**
* send message
*/
Task.prototype.sendMessage = function (msg) {
	var packed;

	this.logger.debug("Sending message: ", msg);

	// packing stuff
	packed = format_helper.serialize(msg);

	// sending
	process.send(packed);
};


/**
* Format progress status to be sent
*/
Task.prototype.sendProgressStatus = function (label) {
	var self = this;
	var msg = {
		"id": self.name,
		"event": CustomEvents.ON_JOB_CHANGE,
		"status": self.status
	};

	// adding more details
	msg.status.details = label || ""

	// sending
	this.sendMessage(msg);
};




/**
* Change task state
*/
Task.prototype.changeState = function (nextState, msg) {
	this.logger.info("State changed from ", this.status.current_state, " to ", nextState);
	this.status.current_state = nextState;
	this.sendProgressStatus(msg);
};



/**
* START FINITE STATE MACHINE
**/
Task.prototype.startFSM = function () {
	var self = this;

	// configuring engine
	engine.registerFSM({

		// FSM registry name 
		name    : self.name,
		logic   : self.configure,

		// States
		state  : [
			{
				name    : States.LOADED,
				initial : true,
			},
			{
				name    : States.STAND_BY,
			},
			{
				name    : States.STARTED,
			}			
		],

		// transitions 
		transition : [
			{
				event       : CustomEvents.ON_JOB_WAKEUP,
				from        : States.LOADED,
				to          : States.STAND_BY
			},
			{
				event       : CustomEvents.ON_JOB_START,
				from        : States.STAND_BY,
				to          : States.STARTED
			}			
		]
	});

	// starting engine
	self.machine = engine.createSession(self.name);
};


module.exports = Task;
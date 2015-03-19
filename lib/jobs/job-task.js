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


Task.prototype.onStateEnter = function (session, state, transition, msg) {
	var isFirstState = (msg.msgId == "__initial_transition_id");
	var targetEvent = {
		"msgId": ""
	};


	// handling first state
	if (isFirstState) {
		targetEvent.msgId = CustomEvents.ON_JOB_WAKEUP
	}
};

Task.prototype.onStateExit = function (session, state, transition, msg) {
	console.log(arguments);
};


/**
* Loads job
*/
Task.prototype.load = function () {

	try {
		this.raw = require("./tasks/" + this.name);

		this.logger.debug(this.raw);
		this.logger.info(this.name, " has been initialized successfully!");

		// configuring engine
		var self = this;
		engine.registerFSM({

			// FSM registry name 
			name    : self.name,
			logic   : function () {
				// a "hack" to mturn base object into the machine state reference
				return self;
			},

			// States
			state  : [
			{
				// LOADED - Initial state
				name    : States.LOADED,
				initial : true,
				onEnter : self.onStateEnter,
				onExit  : self.onStateExit
			},
			{
				name    : States.STAND_BY,
				onEnter : self.onStateEnter,
				onExit  : self.onStateExit
			},
			{
				name    : States.STARTED,
				onEnter : self.onStateEnter,
				onExit  : self.onStateExit				
			}			
			],

			// transitions 
			transition : [
			{
				event       : CustomEvents.WAKEUP,
				from        : States.LOADED,
				to          : States.STAND_BY
			},
			{
				event       : CustomEvents.START,
				from        : States.STAND_BY,
				to          : States.STARTED
			}			
			]
		});

		this.changeState(States.LOADED, " Job machine has been created sucessfully!");

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

	// checking state change
	if (this.status.current_state === nextState) {
		this.logger.warn("Machine is on state ", nextState, " already!");
	} else  {

		// changing state
		this.logger.info("State changed from ", this.status.current_state, " to ", nextState);
		this.status.current_state = nextState;

		// sending progress message when having one
		if (msg) {
			this.logger.debug("Preparing to send message ", msg);
			this.sendProgressStatus(msg);
		}
	}
};



/**
* START FINITE STATE MACHINE
**/
Task.prototype.startFSM = function () {
	// starting engine
	this.machine = engine.createSession(this.name);
};


module.exports = Task;
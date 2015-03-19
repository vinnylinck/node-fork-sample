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
		"progress": 0,
		"details": ""
	};
	this.raw = null;
	this.machine = null;
}


Task.prototype.onStateChange = function (session, state, transition, msg) {
	this.logger.debug("Machine State transition from ", transition.initialState.name, " to ",  transition.finalState.name);
	this.changeState(transition.finalState.name);
};


Task.prototype.onStateEnter = function (session, state, transition, msg) {
	var isFirstState = (msg.msgId == "__initial_transition_id");
	var targetEvent = {
		"msgId": ""
	};

	// handling first state
	if (isFirstState) {
		this.changeState(States.LOADED, "Job task loaded successfully");
	} else {

		// handling current states
		switch (state.name) {
			case States.AWAITING_OK:
				this.sendProgressStatus("Awaiting for decision...");
				break;
			default:
				this.logger.warn("Invalid ENTER state ", state);
				this.logger.debug(transition);
				this.logger.debug(msg);
				break;
		}
	}
};


Task.prototype.onStateExit = function (session, state, transition, msg) {
	// handling message when leaving the state
	switch (state.name) {

		// GENERAL
		case States.LOADED:
		case States.AWAITING_OK:
			this.logger.debug("Leaving state ", state.name);
			break;

		// Woops
		default:
			this.logger.warn("Invalid EXIT state ", state);
			this.logger.debug(transition);
			this.logger.debug(msg);
			break;
	}
};


/**
* Loads job
*/
Task.prototype.load = function () {

	try {
		this.raw = require("./tasks/" + this.name);

		this.logger.debug(this.raw);
		this.logger.info(this.name, " has been required successfully!");

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
				name    : States.AWAITING_OK,
				onEnter : self.onStateEnter,
				onExit  : self.onStateExit
			}		
			],

			// transitions 
			transition : [
			{
				event        : CustomEvents.START,
				from         : States.LOADED,
				to           : States.AWAITING_OK,
				onTransition : self.onStateChange
			},
			{
				event        : CustomEvents.RESUME,
				from         : States.AWAITING_OK,
				to           : States.CONNECTING,
				onTransition : self.onStateChange
			}			
			]
		});

		this.logger.debug("FSM machine has been created.");
		
		// starting engine
		this.logger.info("Starting FSM...");
		this.machine = engine.createSession(this.name);

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

	// define line clear
	msg.clear = (msg.status.details.length <= self.status.details.length ? true : false);

	// updating last message
	self.status.details = msg.status.details;

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
Task.prototype.startFlow = function () {
	var event = format_helper.toMachineEvent(CustomEvents.START);

	this.logger.info("Starting machine flow...");
	this.machine.dispatch(event);
};


/**
* SENDING DEPENDENCIES TO EXECUTOR
**/
Task.prototype.retrieveDependencies = function () {
	var self = this;
	var msg;
	
	this.logger.info("Retrieving task dependencies...");

	msg = {
		"id": self.name,
		"event": CustomEvents.ON_JOB_ASKDEP,
		"status": self.raw.getDependencies()
	};

	this.sendMessage(msg);
};

/**
* RESUMING MACHINE FLOW
**/
Task.prototype.resume = function () {
	var event = format_helper.toMachineEvent(CustomEvents.RESUME);

	this.logger.info("Resuming machine flow...");
	this.machine.dispatch(event);	
};

module.exports = Task;
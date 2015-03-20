/* jslint node:true */
// ****************************** GLOBAL DEFINITIONS  ******************************
var engine = require("automata");

var format_helper = require("../helpers/format-helper.js");
var logger_factory = require("../logging/logger-factory");

var States = require("./job-states");
var CustomEvents = require("./job-events");
var JobErrors = require("./job-errors");

// ****************************** TASK  ******************************
function Task(name, options, parentLogger) {
	this.name = name;
	this.settings = options;
	this.status = {
		"current_state": States.UNDEFINED,
		"progress": 0,
		"details": ""
	};

	this.logger = logger_factory.getLogger("task.js", parentLogger);
	this.raw = null;
	this.machine = null;
}


Task.prototype.fire = function (session, eventName) {
	var event = format_helper.toMachineEvent( eventName );
	
	// firing event
	this.logger.error("Firing machine event ", event);

	try {	
		session.dispatch(event);
	} catch (err) {
		this.logger.debug(err);
		// ???????
	}
};




Task.prototype.onStateEnter = function (session, state, transition, msg) {
	this.logger.info("Entering to state ", state.name);

	// LOADED
	if (state.name === States.LOADED) {
		// changing shadow state
		this.changeState(States.LOADED, "Ready to start.");
		this.fire(session, CustomEvents.ON_JOB_LOADED);

	// STARTED
	} else if (state.name === States.STARTED) {
		this.status.progress++;
		this.sendProgressStatus("Job has been started. Connecting to database...");
		this.raw.connect(this.settings.db, function (err) {

			// checking errors
			if (err) {
				session.logic.logger.error("Error connecting to database.");
				session.logic.logger.debug(err);

				session.logic.status.progress = JobErrors.DB_CONNECTION_ERROR;
				session.logic.changeState(States.FAILED, "Error connecting to database.");
				//session.logic.fire(session, CustomEvents.ON_JOB_FAILED);
			} else {
				console.log("FUNFOU");
			}

		});

	} else {
		this.logger.warn("Invalid ENTER state ", state);
		this.logger.debug(transition);
		this.logger.debug(msg);
	}
};

Task.prototype.onStateChange = function (session, state, transition, msg) {
	this.logger.debug("Machine State transition from ", transition.initialState.name, " to ",  transition.finalState.name);
	this.changeState(transition.finalState.name);
};

Task.prototype.onStateExit = function (session, state, transition, msg) {
	this.logger.info("Leaving state ", state.name);
};


/**
* Loads job
*/
Task.prototype.load = function () {

	try {
		this.raw = require("./tasks/" + this.name);
		this.logger.info(this.name, " has been required successfully!");

		// configuring engine
		var self = this;
		engine.registerFSM({

			// FSM registry name 
			name    : self.name,
			logic   : function () {
				// a "hack" to mturn base object into the machine state reference
				self.logger.debug("Building machine state...");
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
					name 	: States.STARTED,
					onEnter : self.onStateEnter,
					onExit  : self.onStateExit
				}				
			],

			// transitions 
			transition : [
				{
					event : CustomEvents.ON_JOB_LOADED,
					from  : States.LOADED,
					to    : States.STARTED,
					onTransition: self.onStateChange
				}
			]
		});

		this.logger.debug("FSM machine has been created.");
		this.sendProgressStatus("Task loaded successfully!");
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
Task.prototype.startFSM = function () {
	// starting engine
	this.logger.info("Starting FSM...");
	this.machine = engine.createSession(this.name);
};

module.exports = Task;
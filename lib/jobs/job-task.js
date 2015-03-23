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
	this._start_stamp = new Date().getTime();
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

Task.prototype.getTaskOptions = function () {
	var options = this.settings.jobs[this.name];

	// if there is a configuration, must to complete the options
	if (options) {
		// creating dump settings
		options.dump = {};
		options.dump.languages = this.settings.languages;
		options.dump.folder = this.settings.data.bulkpath;
		options.dump.prefix = this.settings.elastic.indexPrefix;
	}

	// returning options
	return options;
};

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

	// ********** LOADED **********
	if (state.name === States.LOADED) {
		// changing shadow state
		this.changeState(States.LOADED, "Ready to start.");
		this.fire(session, CustomEvents.ON_JOB_LOADED);



	// ********** STARTED **********
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
			} else {

				// if it is connected, change state
				session.logic.status.progress++;
				session.logic.sendProgressStatus("Connected to database.");
				session.logic.fire(session, CustomEvents.ON_JOB_STARTED);
			}

		});

	// ********** DATA FETCH **********
	} else if (state.name === States.DATAFETCH) {
		this.status.progress++;
		this.sendProgressStatus("Retrieving data from database...");
		this.raw.getData(function (err, recordset) {
			// checking errors
			if (err) {
				session.logic.logger.error("Error retrieving data from database!");
				session.logic.logger.debug(err);

				session.logic.status.progress = JobErrors.DB_REFUSED_ERROR;
				session.logic.changeState(States.FAILED, "Error getting data.");
			} else {

				// if it is connected, change state
				session.logic.status.progress++;
				session.logic.sendProgressStatus(recordset.length + " rows retrieved from database");
				session.logic.fire(session, CustomEvents.ON_JOB_DATAFETCH);
			}			
		});

	// ********** DATA COMPILE **********
	} else if (state.name === States.COMPILED) {
		this.status.progress++;
		this.sendProgressStatus("Compiling recordset...");
		this.raw.compile(this.status.progress, 30, function (dict, partial, compiled, total, finished) {

			// updating status
			session.logic.status.progress = partial;
			session.logic.sendProgressStatus("Processing...(" + compiled + "/" + total + ")");
			session.logic.logger.debug(compiled, " of ", total);
			session.logic.logger.warn("Has finished? ", finished);

			// has finished?
			if (finished) {
				session.logic.logger.info("Data has been compiled: ", compiled, " of ", total);
				session.logic.logger.debug(dict.count(), " records stored in hashmap.");
				session.logic.sendProgressStatus("Data has been compiled successfully!");
				session.logic.fire(session, CustomEvents.ON_JOB_COMPILED);
			}
		});

	// ********** DATA DUMP **********
	} else if (state.name === States.DUMPED) {
		this.status.progress++;
		this.sendProgressStatus("Dumping data file into " + this.settings.data.bulkpath);
		this.logger.debug("Job options: ", this.getTaskOptions());

		this.raw.dump(
			// specific job options
			this.getTaskOptions(),

			// current progress %
			this.status.progress,

			// highest percent to be achieved
			50,

			// status update callback
			function (partial, dumped, total, finished) {

				// updating status
				session.logic.status.progress = partial;
				session.logic.sendProgressStatus("Dumping...(" + dumped + "/" + total + ")");
				session.logic.logger.debug(dumped, " of ", total);
				session.logic.logger.warn("Has finished? ", finished);

				// has finished?
				if (finished) {
					session.logic.logger.info("Data has been dumped: ", dumped, " of ", total);
					session.logic.sendProgressStatus("Data has been dumped successfully!");
					session.logic.fire(session, CustomEvents.ON_JOB_DUMPED);
				}
			});



	// ********** DATA PERSISTENCE **********
	} else if (state.name === States.PERSISTED) {

		// updating status
		this.status.progress++;
		this.sendProgressStatus("Preparing information to be persisted...");
		
		// get data to be persisted
		var toBePersisted = this.raw.toPersist();
		this.status.progress++;

		// sending data to be persisted if having one
		if (toBePersisted) {
			this.sendProgressStatus("Saving data to be reused...");
			this.status.progress++;
			this.persist(toBePersisted);
		} else {
			// case else, go ahead
			this.fire(session, CustomEvents.ON_JOB_PERSISTED);
		}

	// ********** CLEANSING **********
	} else if (state.name === States.CLEANED) {
		this.status.progress++;
		this.sendProgressStatus("Disposing allocated memory...");
		this.raw.dispose();

		this.status.progress++;
		this.sendProgressStatus("Memory disposed successfully!");

		this.status.progress++;
		this.sendProgressStatus("Closing database connection...");
		this.raw.disconnect();

		this.status.progress++;
		this.sendProgressStatus("Database connection has been closed!");

		this.status.progress++;
		this.sendProgressStatus("Data structure has been removed from memory successfully!");

		session.logic.fire(session, CustomEvents.ON_JOB_CLEANED);


	// ********** DATA BULK **********
	} else if (state.name === States.BULKED) {
		this.status.progress++;
		this.sendProgressStatus("Bulking data files...");
		this.raw.bulk(this.status.progress, 90, function (partial, bulked, total, finished) {

			// updating status
			session.logic.status.progress = partial;
			session.logic.sendProgressStatus("Bulking...(" + bulked + "/" + total + ")");
			session.logic.logger.debug(bulked, " of ", total);
			session.logic.logger.warn("Has finished? ", finished);

			// has finished?
			if (finished) {
				session.logic.logger.info("Data has been bulked: ", bulked, " of ", total);
				session.logic.sendProgressStatus("Data has been bulked successfully!");
				session.logic.fire(session, CustomEvents.ON_JOB_BULKED);
			}
		});

	// ********** VALIDATE **********
	} else if (state.name === States.VALIDATED) {

		// updating status
		this.status.progress++;
		this.sendProgressStatus("Validating job execution...");

		// validating
		this.raw.validate(this.status.progress, 98, function (partial, msg, finished) {
			// updating status
			session.logic.status.progress = partial;
			session.logic.sendProgressStatus(msg);
			session.logic.logger.warn("Has finished? ", finished);

			// has finished?
			if (finished) {
				session.logic.sendProgressStatus("Validation has been completed!");
				session.logic.fire(session, CustomEvents.ON_JOB_FINISHED);
			}
		});

	// ********** FINISHING **********
	} else if (state.name === States.FINISHED) {

		// updating status
		this.status.progress = 99;
		this.sendProgressStatus("Finishing tasks...");

	// ********** UNKNOWN **********
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

	// last state - FINISH!!!!
	if (state.name === States.FINISHED) {
		this.status.progress = 100;
		this.sendProgressStatus("Job has finished successfully");

		// everything happened pretty much fine!
		setTimeout(function () {
			process.exit(0);
		}, 1000);
	}
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
					name    : States.LOADED,
					initial : true,
					onEnter : self.onStateEnter,
					onExit  : self.onStateExit
				},
				{
					name 	: States.STARTED,
					onEnter : self.onStateEnter,
					onExit  : self.onStateExit
				},
				{
					name 	: States.DATAFETCH,
					onEnter : self.onStateEnter,
					onExit  : self.onStateExit
				},
				{
					name 	: States.COMPILED,
					onEnter : self.onStateEnter,
					onExit  : self.onStateExit
				},
				{
					name 	: States.DUMPED,
					onEnter : self.onStateEnter,
					onExit  : self.onStateExit
				},
				{
					name 	: States.PERSISTED,
					onEnter : self.onStateEnter,
					onExit  : self.onStateExit
				},				
				{
					name    : States.CLEANED,
					onEnter : self.onStateEnter,
					onExit  : self.onStateExit					
				},
				{
					name    : States.BULKED,
					onEnter : self.onStateEnter,
					onExit  : self.onStateExit						
				},				
				{
					name    : States.VALIDATED,
					onEnter : self.onStateEnter,
					onExit  : self.onStateExit						
				},
				{
					name    : States.FINISHED,
					onEnter : self.onStateEnter,
					onExit  : self.onStateExit						
				}				
			],

			// Transitions 
			transition : [
				{
					event : CustomEvents.ON_JOB_LOADED,
					from  : States.LOADED,
					to    : States.STARTED,
					onTransition: self.onStateChange
				},
				{
					event : CustomEvents.ON_JOB_STARTED,
					from  : States.STARTED,
					to    : States.DATAFETCH,
					onTransition: self.onStateChange
				},
				{
					event : CustomEvents.ON_JOB_DATAFETCH,
					from  : States.DATAFETCH,
					to    : States.COMPILED,
					onTransition: self.onStateChange
				},
				{
					event : CustomEvents.ON_JOB_COMPILED,
					from  : States.COMPILED,
					to    : States.DUMPED,
					onTransition: self.onStateChange
				},
				{
					event : CustomEvents.ON_JOB_DUMPED,
					from  : States.DUMPED,
					to    : States.PERSISTED,
					onTransition: self.onStateChange	
				},
				{
					event : CustomEvents.ON_JOB_PERSISTED,
					from  : States.PERSISTED,
					to    : States.CLEANED,
					onTransition: self.onStateChange
				},
				{
					event : CustomEvents.ON_JOB_CLEANED,
					from  : States.CLEANED,
					to    : States.BULKED,
					onTransition: self.onStateChange					
				},
				{
					event : CustomEvents.ON_JOB_BULKED,
					from  : States.BULKED,
					to    : States.VALIDATED,
					onTransition: self.onStateChange
				},
				{
					event : CustomEvents.ON_JOB_FINISHED,
					from  : States.VALIDATED,
					to    : States.FINISHED,
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

Task.prototype.persist = function (data) {
	var self = this;
	var msg = {
		"id": self.name,
		"event": CustomEvents.ON_JOB_PERSIST,
		"status": data
	};
	
	// sending
	this.sendMessage(msg);
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

/**
* RESUME
**/
Task.prototype.resume = function () {
	// starting engine
	this.logger.info("Resuming FSM...");

	// checking state to be resumed
	if (this.status.current_state === States.PERSISTED) {
		this.fire(this.machine, CustomEvents.ON_JOB_PERSISTED);
	} else {
		this.logger.warn("Can't resume machine from state ", this.status.current_state);
		this.status.progress = JobErrors.RESUME_ERROR;
		this.changeState(States.FAILED, "Job cannot be resumed!");
	}
};


/**
* KILL TASK
**/
Task.prototype.kill = function () {

	// detect success
	if (this.status.progress === 100) {
		process.exit(0);
	} else {
		process.exit(this.status.progress);
	}
};

module.exports = Task;
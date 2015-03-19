/* jslint node:true */
// ****************************** GLOBAL DEFINITIONS  ******************************
var logger_factory = require("../logging/logger-factory");

var Task   = require("./job-task");
var States = require("./job-states");
var Commands = require("./job-commands");

// ****************************** WORKER  ******************************
var name, settings, task;

try {
	// listening command messages
	process.on('message',  function (cmd) {
		// managing commands
		switch (cmd) {
			
			// start
			case Commands.START:
				logger.info("START command received.");
				task.startFlow();
				break;

			// asking for dependencies
			case Commands.ASKDEP:
				logger.info("ASKDEP command received.");
				task.retrieveDependencies();
				break;

			// start machine flow for real.
			case Commands.RESUME:
				logger.info("RESUME command received.");
				task.resume();
				break;

			// unknown
			default:
				logger.warn("Invalid command ", cmd);
				break;
		}
	});


	// parsing args
	name = process.argv[2];
	settings = JSON.parse(process.argv[3]);

	// initializing logs
	logger = logger_factory.getLogger(name + ".js", null, settings.logging);

	// creating task
	logger.info("Creating job task ", name);
	task = new Task(name, logger);

	// loading engine
	task.load();

} catch (err) {

	// logging error
	if (logger) {
		logger.error(err);
	}

	// exit

} finally {
	
	// exporting...
	module.exports = exports;
}
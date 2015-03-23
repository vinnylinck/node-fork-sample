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

		logger.info(cmd + " command received.");

		// managing commands

		// start
		if (cmd === Commands.START) {
			task.startFSM();

		// resume
		} else if (cmd === Commands.RESUME) {
			task.resume();

		// kill
		} else if (cmd === Commands.KILL) {
			task.kill();

		// unknown
		} else {
			logger.warn("Invalid command ", cmd);
		}
	});


	// parsing args
	name = process.argv[2];
	settings = JSON.parse(process.argv[3]);

	// initializing logs
	logger = logger_factory.getLogger(name + ".js", null, settings.logging);

	// creating task
	logger.info("Creating job task ", name);
	task = new Task(name, settings, logger);

	// loading engine
	task.load();

} catch (err) {

	// logging error
	if (logger) {
		logger.error("Fatal error running task ", name);
		logger.debug(err);
	}

	// exit

} finally {
	
	// exporting...
	module.exports = exports;
}
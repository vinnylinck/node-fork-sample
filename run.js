/* jslint node:true */
// ****************************** GLOBAL DEFINITIONS  ******************************
var cli_helper = require("./lib/helpers/cli-helper");
var fs_helper = require("./lib/helpers/fs-helper");
var logger_factory = require("./lib/logging/logger-factory");
var gui = require("./lib/gui");
var executor = require("./lib/executor");


// ****************************** JOB LIST  ******************************
var job_list = [
	
	// global-parameters
	{
		"name": "global-parameters",
		"dependencies": []
	},

	// categories
	{
		"name": "barcoderules",
		"dependencies": []
	},

];

// ****************************** MAIN  ******************************
var PROC_RUN_STAMP = new Date().getTime(),
	PROC_EXIT;

var parameters,				// parsed parameters
	settings,				// application settings
	logger,					// logger object
	areFoldersOk = false;	// flag for folder creation status

try {
	// parsing command line arguments: success is pre-requirement for entire run process
	parameters =  cli_helper.parseCliArgs(process.argv);

	// loading application settings file
	settings   =  fs_helper.requireIfExists("./conf/env/" + parameters.target + ".conf.js", {});

	// configuring dynamic folders
	settings.data.datedpath = settings.data.rootpath + "/" + fs_helper.getDatedFolderName();
	settings.data.bulkpath  = settings.data.datedpath + settings.db.name;

	// basic folder structure assurance
	areFoldersOk = fs_helper.createFolders([

		// .dat files folder tree
		settings.data.rootpath,

		// dated folder
		settings.data.datedpath,

		// bulk file location
		settings.data.bulkpath,	

		// logging folder
		settings.logging.rootpath

	]);

	// check folder creation
	if (!areFoldersOk) {
		throw "Error creating folder structure";
	}


	// preparing logger
	logger = logger_factory.getLogger("run.js", null, settings.logging);

	// initializing GUI
	gui.clear();
	gui.prepareScreen();

	// initializing pipeline
	executor.setUpdateHook(function (id, progress, message, clear) {

		// updating gui	
		gui.printJobLine(id, progress, message, clear);
	});

	// running all jobs
	logger.info("Preparing to run ", job_list);
	logger.debug("Running with options ", settings);

	// running all
	executor.run(job_list, settings, logger);

} catch (err) {
	console.error(err);

	// ??????
}
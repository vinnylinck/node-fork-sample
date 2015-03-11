/* jslint node:true */
// ****************************** GLOBAL DEFINITIONS  ******************************
var cli_helper = require("./lib/helpers/cli-helper");
var fs_helper = require("./lib/helpers/fs-helper");
var logger_factory = require("./lib/logging/logger-factory");



// ****************************** MAIN  ******************************
var parameters,				// parsed parameters
	settings,				// application settings
	logger,					// logger object
	areFoldersOk = false;	// flag for folder creation status

try {
	// parsing command line arguments: success is pre-requirement for entire run process
	parameters =  cli_helper.parseCliArgs(process.argv);

	// loading application settings file
	settings   =  fs_helper.requireIfExists("./conf/env/" + parameters.target + ".conf.js", {});

	// basic folder structure assurance
	areFoldersOk = fs_helper.createFolders([

		// .dat files folder
		settings.data.rootpath,

		// logging folder
		settings.logging.rootpath

	]);

	// check folder creation
	console.log(areFoldersOk);
	if (!areFoldersOk) {
		throw "Error creating folde structure";
	}


	// preparing logger
	logger = logger_factory.getLogger("run.js", null, settings.logging);

	// 

} catch (err) {
	console.error(err);

	// ??????
}
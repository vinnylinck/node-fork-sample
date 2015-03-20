/* jslint node:true */
module.exports = {

	// data saving configuration sample
	data: {
		rootpath: "./data"
	},

	// logging configuration values
	logging: {

		// main log folder
		rootpath: "./logs",

		// period to store messages in same log file
		period: "1d",

		// how long files must be kept for history? (based on period unit)
		history_size: 30,

		// log level
		level: "debug"
	},

	db: {
		host: "10.126.41.16",
		port: 54243,
		name: "SalesAssistantPRD",
		usr: "salesassistant",
		pwd: "s@lesAssist@nt"
	}	
};
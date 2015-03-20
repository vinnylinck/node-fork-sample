/* jslint node:true */
var ansi = require('ansi'), cursor = ansi(process.stdout);
var clc = require('cli-color');
var HashMap = require('hashmap');
var jobLines = new HashMap();
var rangeStart = 4;

exports.clear = function () {
	console.log(clc.reset);
};

exports.println = function (msg) {
	console.log(msg);
};

exports.prepareScreen = function () {
	cursor.hide();
	this.println("-----------------------------------------------------");
	this.println('  Elasticsales Integration Tool v2.0');
	this.println('-----------------------------------------------------');
};

exports.end = function (exitCode, ms) {
	this.println( clc.moveTo(0,15) );
	this.println('-----------------------------------------------------');
	this.println('JOB HAS FINISHED AFTER ' + ms + ' ms WITH EXIT CODE ' + exitCode);
	this.println('-----------------------------------------------------');
};

exports.formatProgress = function (status) {
	var prog,
		color = clc.blue;

	// handling warning cenarios
	if (status == "WARN") {
		prog = "WARN";
		color = clc.yellow;

	// handling errors	
	} else if (status < 0){
		prog = "#ERR";
		color = clc.red;

	// handling success	
	} else if (status == 100) {
		prog = "DONE";
		color = clc.green;

	// handling common progress
	} else {

		// formatting numbers
		if (status < 10){
			prog = "  " + Math.ceil(status) + "%";
		} else if (status < 100) {
			prog = " " + Math.ceil(status) + "%";
		} else if (status >= 100) {
			prog = "100%";			
		}
	}

	// returning colored.
	return color(prog);
};


exports.printJobLine = function (jobname, progress, message, clear) {
	var self = this;
	var row  = 0;

	// checking job line
	if (jobLines.has(jobname)) {
		row = jobLines.get(jobname);
	} else {
		row = jobLines.count() + rangeStart;
		jobLines.set(jobname, row);
	}
	
	// printing
	setImmediate(function () {
		process.stdout.write( clc.moveTo(0,row) );

		if (clear) {
			process.stdout.clearLine();
		}
		self.println('['+ self.formatProgress(progress) +'] '+ clc.bold(jobname) + ': ' + clc.italic(message) );
	});
};
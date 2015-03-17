/* jslint node:true */
var fork = require("child_process").fork;

function Job(jobname) {
	this.name = jobname;
	this.onchange = function (){};
};


Job.prototype.load = function () {
};

module.exports = Job;

/*

Job.prototype.onJobError =  function (err) {
	console.log(err);
};

exports.onJobExit =  function (code, signal) {
	console.log(code, " # ", signal);
};

exports.onJobClose =  function (code, signal) {
	console.log(code, " # ", signal);
};

exports.onJobDisconnect =  function () {
	console.log(arguments);
};

exports.onJobMessage =  function (m) {
	console.log(m);
};
*/
var clc = require('cli-color');

exports.clear = function () {
	console.log(clc.reset);
};

exports.println = function (msg) {
	console.log(msg);
};

exports.prepareScreen = function () {
	this.println("-----------------------------------------------------");
	this.println('  Elasticsales Integration Tool v2.0');
	this.println('-----------------------------------------------------');
};
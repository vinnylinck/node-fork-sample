/* jslint node:true */
function Dumper() {
	this.path = require("path");
	this.fs = require('fs');
	this.handler = 0;
	this.fullFilePath = "";
}
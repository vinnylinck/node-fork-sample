/* jslint node:true */
var _ = require("lodash");
var bunyan = require("bunyan"); 

/**
 * Creates a new logger object
 *
 * @param {string} name reference name for log message tracking/debugging
 * @param {object} options logger options object
 *
 * @return {object} fresh logger object
 * 
 */
 exports.createLogger = function (name, options) {

 	// building file path
 	var filepath = options.rootpath + "/" + name + ".log";

 	// formatting log options considering the defaults
 	var settings = {
 		name: name || "unknown",
 		streams: [
 		{
 			type: "rotating-file",
 			path: filepath,
 			period: options.period 	|| "1d",
 			level: options.level || "info",
 			count: options.history_size || 30 			
 		}] 		
 	};

 	// creating/returning a new logger instance
 	return bunyan.createLogger(settings);
 };


/**
 * Creates a child logger object derived from anotther
 *
 * @param {string} name reference name for log message tracking/debugging
 * @param {object} logger object reference for child logging
 *
 * @return {object} new child logger object
 * 
 */
 exports.createChild = function (name, logger) {
 	var options = _.extend({widget_type: name});
 	return logger.child(options);
 };

/**
 * Creates a logger object
 *
 * @param {string} name reference name for log message tracking/debugging
 * @param {object} logger object reference for child logging
 *
 * @return {object} new logger object
 * 
 */
 exports.getLogger = function (name, logger, options) {
 	return	(logger ? this.createChild(name, logger) : this.createLogger(name, options));
 };
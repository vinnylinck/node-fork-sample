/* jslint node:true */

/**
 * Parse a group of arguments with pattern <key>=<value>
 *
 * @param {array} args arguments array/list
 * @return {object} parsed arguments
 * 
 */
exports.parse = function (args) {
	var parsed = {};
	var option, key;
	

	args.forEach(function (value, index) {

		// first parameters will be ignored because CLI arguments are formatted following the pattern below (no caracter '='.
		//
		// [0] node
		// [1] <script name>
		// [x]  all parameters came after...
		if (value.indexOf('=') > -1) {
			
			// splitting values
			option = value.split('=');

			// parameter is ALWAYS lowercase. :)
			key = option[0].toLowerCase();

			// "saving"
			parsed[key] = option[1];
		}
	});
	return parsed;	
};

/**
 * Parse Command Line Interface arguments
 *
 * @param {array} args arguments received by command line
 * @return {object} application settings object
 * 
 */
exports.parseCliArgs = function (args) {
	var parsed =  this.parse(args);

	// setting defaults in case of no parameters
	return {

		// the default si DEV environment
		target : parsed.target || "dev"

	};
};
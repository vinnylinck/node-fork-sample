/* jslint node:true */
var fs = require("fs");

/**
 * Requires a module only if file does exist
 *
 * @param {string} filepath target file path
 * @param {object} defaultValue value to be returned in case of file could not be loaded.
 *
 * @return {object} loaded file content or defaultValue
 * 
 */
exports.requireIfExists = function (filepath, defaultValue) {
	var loaded;


	if (fs.existsSync(filepath)) {
		loaded = require("../../" + filepath);				// need to go to root path, before requiring.
	} else {
		loaded = defaultValue;
	}
	
	return loaded;
};



/**
 * Create a single folder when does not exist
 *
 * @param {string} dir folder to be created
 *
 * @return  {bool} tru if sucess, false case else
 */
exports.folderAssurance = function (dir) {
	var result = false;

	try {
		if (!fs.existsSync(dir)){
			fs.mkdirSync(dir);			
		}

		result = true;

	} catch (e) {
		console.error("Error creating folder ", dir , e );	
	}

	return result;
};


/**
 * Create folders in case they don't exist already
 *
 * @param {string|array} folders list of folders to be created.
 *
 * @return {bool} true for sucess, false case else.
 *
 */
 exports.createFolders = function (folders) {
 	var self = this;
 	var counter = 0;

 	// in case of one folder, which means, a string, ned to encapsulate as an array.
 	// case else, assuming it is an array.
 	var list = ( typeof folders == "string" ? [folders] :  folders);

 		
 		// looping...
 		for (; counter < list.length; counter++) {
 			// in case of failure, "BREAK"
 			if (!self.folderAssurance(list[counter])) {
 				break;
 			}
 		}

 		// if all items were processed, everything is ok
 		return (counter === list.length);
 };


exports.formatDateVal = function (val) {
	return (val <10 ? '0' + val : val);
};


 exports.getDatedFolderName = function () {
	var stampRef = new Date();
	
	var fname = stampRef.getFullYear() + 

	this.formatDateVal( stampRef.getMonth() + 1 ) + 
	this.formatDateVal( stampRef.getDate() ) + 
	'_'  +
	this.formatDateVal( stampRef.getHours() ) +
	this.formatDateVal( stampRef.getMinutes() ) +
	'/';
	
	return fname;
};

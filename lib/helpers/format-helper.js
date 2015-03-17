/* jslint node:true */
exports.toArray = function (obj) {

	// handling string and "non-array" pbjects
	if (typeof obj == "string" || (obj.push === undefined && obj.pop === undefined)) {
		return [obj];

	} else {
		return obj;
	}
};
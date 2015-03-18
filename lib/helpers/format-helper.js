/* jslint node:true */
exports.toArray = function (obj) {

	// handling string and "non-array" pbjects
	if (typeof obj == "string" || (obj.push === undefined && obj.pop === undefined)) {
		return [obj];

	} else {
		return obj;
	}
};

exports.serialize = function (obj) {

	if (typeof obj == "string") {
		return obj;
	} else {
		return JSON.stringify(obj);
	}
};

exports.deserialize = function (obj) {
	var result;

	try {
		result = JSON.parse(obj);
	} catch (e) {
		result = obj;
	}

	return result;e
};
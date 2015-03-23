/* jslint node:true */
var _ = require("lodash");
var db_helper = require("./db-helper");

var LANG_REF = [
	"en", // 1 English en-US
	"br", // 2 Português pt-BR
	"es", // 3 Español es-ES
	"pt", // 4 Portugues pt-PT
	"fr", // 5 French fr-FR
	"tr", // 7 Turkish tr-TR
	"dt" // 8 German Temp
];

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

	return result;
};

exports.toMachineEvent = function (id) {
	return {
		"msgId": id
	};
};

exports.loopObject = function (arr, cb) {
	// looping object
	for (var key in arr) {
		// check if it is an attribute
		if (arr.hasOwnProperty(key)) {
			cb(key, arr[key]);
		}
	}	
};

exports.resolveLanguageId = function (country) {
	return (_.indexOf(LANG_REF, country.toLowerCase()) + 1);
};

exports.decodeGlobalParameter = function (record) {
	var decoded = {};

	// CHECKING PILOT STORES
	if (_.startsWith(record.id, "PILOT_STORES_")) {
		decoded.language = this.resolveLanguageId(record.id.split("_")[2]);
		decoded.values = record.value.split(",");
		decoded.clause = db_helper.buildInClause(decoded.values);
	}
	return decoded;
};
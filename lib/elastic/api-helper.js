/* jslint node:true */
var format_helper = require("../helpers/format-helper");

exports.getIndexName = function (prefixOptions, langId) {
	var prefix = prefixOptions || "sales";
	var index  = prefix + "*";

	if (langId) {
		index = prefix + format_helper.resolveIndexSufix(langId);
	}

	return index;
};
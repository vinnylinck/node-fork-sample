/* jslint node:true */
var sql = require("mssql");
var db_helper = require("../../helpers/db-helper.js");
var connection;

exports.connect = function (options, cb) {
	var conn_string = db_helper.toConnectionString(options);
	connection = new sql.Connection(conn_string,cb);
};
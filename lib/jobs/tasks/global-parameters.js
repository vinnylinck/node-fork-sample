/* jslint node:true */
var sql = require("mssql");
var HashMap = require("hashmap");

var db_helper = require("../../helpers/db-helper.js");
var format_helper = require("../../helpers/format-helper.js");
var connection, recordset, map = new HashMap();



exports.dispose = function () {
	recordset = undefined;
	map.clear();
};

exports.disconnect = function () {
	connection.close();
};

exports.connect = function (options, cb) {
	var conn_string = db_helper.toConnectionString(options);
	connection = new sql.Connection(conn_string,cb);
};

exports.query = function () {
	var cmd = "" +  
	"SELECT GlobalParameterId as id, value " +
	"FROM ba.GlobalParameter " +
	"WHERE GlobalParameterId LIKE 'PILOT_STORES_%'";
	return cmd;
};

exports.isMultipleQuery = function () {
	return false;
};

exports.getData = function (cb) {
	var self = this;
	
	// handling lost connection scenario
	if (!connection.connected) {
		cb("Connection with database has been lost!");
	} else {

		// executing query
		db_helper.execute(self.query(), self.isMultipleQuery(), connection, function (err, datasource) {
			// storing results
			recordset = datasource;

			// retrieving information
			cb(err, datasource);
		});
	}
};


exports._compile_item = function (map, source, pos) {
	var row = source[pos];
	var decoded = format_helper.decodeGlobalParameter(row);
	var rec = {
		"id": row.id,
		"rawValue": row.value,
		"values": decoded.values,
		"wClause": decoded.clause,
		"language": decoded.language
	};
	map.set(rec.id, rec);
};

exports._compile_data = function (min, step, max, updcb, recordCount) {
	var self = this;
	var compiled, partial, hasFinished;

	// initializing counters
	recordCount = recordCount || 0;
	compiled = recordCount + 1;
	partial = Math.ceil(min + (compiled * step));

	// compile record
	this._compile_item(map, recordset, recordCount);
	
	// formatting status
	hasFinished = (recordset.length == compiled);

	// if has not finished yet
	if (!hasFinished) {
		setImmediate(function () { 
			self._compile_data(min, step, max, updcb, recordCount+1);
		});
	}
	// saving status
	updcb(map, (hasFinished ? max : partial), compiled, recordset.length, hasFinished); 
};

exports.compile = function (minstep, maxstep, update_callback) {
	var step = (maxstep-minstep)/recordset.length;
	this._compile_data(minstep, step, maxstep, update_callback);
};

exports.getMap = function () {
	return map;
};

exports.dump = function (minstep, maxstep, update_callback) {
	update_callback(maxstep, 0, 0, true);
};

exports.toPersist = function () {
	var key  = "pilot_stores";
	var data = {};

	map.forEach(function (value, key) {
		data[value.language] = value.wClause;
	});

	return {
		"key": key,
		"data": data
	};
};

exports.bulk = function (minstep, maxstep, update_callback) {
	update_callback(maxstep, 0, 0, true);
};

exports.validate = function (minstep, maxstep, update_callback) {
	update_callback(maxstep, "Validation has been completed!", true);
};
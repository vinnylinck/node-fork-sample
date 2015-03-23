/* jslint node:true */
var sql = require("mssql");
var HashMap = require("hashmap");

var ElasticDumper  = require("../../elastic/file-dumper");
var db_helper = require("../../helpers/db-helper");

var connection,
	recordset,
	map = new HashMap(),
	dumper = new ElasticDumper();

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
	"SELECT " +
	"SCR.ScanCodeRuleId as id, " +
	"SCR.EANLength as eanLength, " +
	"SCR.EANStartPos as eanStartPos, " +
	"SCR.ExpectedLength as expectedLength " +
	"" +
	"FROM ra.ScanCodeRule SCR " +
	"" +
	"WHERE " +
	"(SCR.ExpectedLength IS NOT NULL) AND " +
	"(SCR.EANStartPos IS NOT NULL) AND " +
	"(SCR.EANLength IS NOT NULL)";

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
	var rec = {
		"id": row.id,
		"eanLength": row.eanLength,
		"eanStartPos": row.eanStartPos,
		"expectedLength": row.expectedLength
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

exports.dump = function (options, minstep, maxstep, update_callback) {
	var self = this;
	var step = (maxstep-minstep)/map.count();
	var partial = 0, dumped = 0, hasFinished = false;

	// opening file
	var fname = "../../" + options.dump.folder + "/" + options.elastic.type_name + ".dat";
	dumper.open(fname);

	// looping map
	map.forEach(function (value, key) {

		// writing information per language
		dumper.indexAllLanguages(options.elastic.type_name, options.dump, key, value);

		// calculating progress
		dumped = dumped +1;
		partial = Math.ceil(minstep + (dumped * step));

		// if has finished, close file
		hasFinished = (map.count() == dumped);

		if (hasFinished) {
			dumper.close();
		}

		//  informing progress
		update_callback(partial, dumped, map.count(), hasFinished);
	});
};


exports.toPersist = function () {
	return null;
};


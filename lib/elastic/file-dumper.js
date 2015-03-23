/* jslint node:true */
var path = require("path");
var fs = require('fs');
var api_helper = require("./api-helper");

function FileDumper() {
	this.handler = 0;
	this.fullFilePath = "";
}


FileDumper.prototype.open = function (fname, flags){
	var options = flags || 'w';
	this.fullFilePath = path.resolve(path.join(__dirname, fname));
	this.handler = fs.openSync(this.fullFilePath, options);
};

FileDumper.prototype.close = function (){
	fs.close(this.handler, function (e) {
		if (e) {
			throw e;
		}
	});
};


FileDumper.prototype.writeToFile = function (buffer) {
	fs.writeSync(this.handler, buffer, 0, buffer.length, null, function (e) {
		throw e;
	});
};

FileDumper.prototype._dump_index= function (index, type, id, data) {
	var record = '{ "index": {"_index": "' + index + '","_type": "' + type + '","_id": "' + id + '" }}\n';

	// adding object
	record += JSON.stringify(data) + '\n';
	this.writeToFile(new Buffer(record));
};

FileDumper.prototype.indexPerLanguage = function (type, id, data, cod_lang, prefix) {

	// formatting index name
	var indexName = api_helper.getIndexName(prefix, cod_lang);
	
	// writting to file
	this._dump_index(indexName, type, id, data);
};

FileDumper.prototype.indexAllLanguages = function (type, options, id, data) {
	var self = this;

	options.languages.forEach(function (cod_lang) {
		// creating index row for each language
		self.indexPerLanguage(type, id, data, cod_lang, options.prefix);
	});
};


module.exports = FileDumper;
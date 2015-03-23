/* jslint node:true */
exports.toConnectionString = function (metadata) {
	return {
		user: metadata.usr,
		password: metadata.pwd,
		server: metadata.host,
		port: metadata.port,
		database: metadata.name,
		connectionTimeout: 999999, 
		requestTimeout : 999999,
    	pool: {
        	max: 10,
        	min: 10,
        	idleTimeoutMillis: 999999
    	}
	};
};


exports.execute = function (query, multiple, connection, callback) {
	// creating request
	var request = connection.request();

	// checking if it is a "multiple" request
	request.multiple = multiple;

	// executing sql
	request.query(query, callback);
};



exports.buildInClause = function (arr) {
	var result = "";
	var isString = (typeof arr[0] == "string");

	arr.forEach(function (element, index) {
		
		// if string, a simple quote before...
		if (isString) {
			result = result +"'";
		}

		// adding data
		result = result + element;

		// ... and after
		if (isString) {
			result = result +"'";
		}

		// check if it is the end
		if (index < (arr.length-1)) {
			result = result + ",";
		}
	});

	return result;
};
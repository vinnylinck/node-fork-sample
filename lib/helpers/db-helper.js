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
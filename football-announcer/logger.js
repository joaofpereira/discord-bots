const fs = require('fs');
const winston = require('winston');

const logDir = './logs/';

if (!fs.existsSync(logDir)) {
	fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
	transports: [
		new winston.transports.File({
			name: 'error-file',
			filename: './logs/exceptions.log',
			json: false,
		}),
		new winston.transports.Console({ level : 'debug' }),
	],
	exitOnError: false,
});

module.exports = logger;

module.exports.stream = {
	write: function(message) {
		logger.info(message);
		console.log('message = ', message);
	},
};
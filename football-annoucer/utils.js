const winston = require('winston');

module.exports = {
  createLogger: function (name) {
    return winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.prettyPrint()
        ),
      defaultMeta: { service: name },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ filename: 'logs' }),
      ],
    });
  },
  // formats a Date into the format "year-month-day"
  createSimplifyDate: function (date) {
    const dateTimeFormat = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' }) 
    const [{ value: month },,{ value: day },,{ value: year }] = dateTimeFormat.formatToParts(date)
    return `${year}-${month}-${day}`
  }
};

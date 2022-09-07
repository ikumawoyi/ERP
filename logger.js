var winston = require('winston'),
    pack = require('./package.json'),
    logger = new (winston.Logger)(),
    first = true,
    fileName = pack.name + '.main.log',
    logFile = pack.name + 'error';
function pad(n) {
    return n < 10 ? '0' + n.toString(10) : n.toString(10);
}
function formattedDate() {
    var st = new Date();
    return st.getFullYear() + '-' + pad(st.getMonth() + 1) + '-' + pad(st.getDate());
}
function getPath() {
    //return './'
    return (process.env.PUBLIC || process.env.HOME) + (process.env.PUBLIC ? '/trusoft_logs/' : '/trusoft_logs/')
}
function restart() {
    clearTransport();
    logger
        .add(winston.transports.File, {
            filename: getPath() + formattedDate() + '-' + fileName,
            json: false,
            showLevel: false,
            handleExceptions: true,
            humanReadableUnhandledException: true,
            level: 'debug',
            safe: false,
            name: pack.name + '-info',
            timestamp: function () {
                return Date.formatTime(new Date());
            },
            formatter: function (options) {
                return options.timestamp() + ':\n\t' + (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '' ) + '\t';
            }
        })
        .add(winston.transports.Console, {
            handleExceptions: true,
            json: false,
            colorize: true
        });
    !first ? logger.log('error', 'Logger Renamed @ %s', new Date().toLocaleString()) : first = !first;
    logger.info('Log Path: ' + getPath() + formattedDate() + '-' + fileName);
    logger.close();

    var e = Date.today();
    e.setHours(24);
    setTimeout(restart, e - Date.now() + 1000);
}

function clearTransport() {
    [pack.name + '-info', winston.transports.Console].forEach(function (n) {
        try {
            logger.remove(n);
        } catch (e) {
        }
    });
}
restart();
module.exports.log = logger.info;
module.exports.info = logger.info;
module.exports.error = logger.error;
module.exports.restart = restart;

console.log = logger.info;
console.error = logger.error;



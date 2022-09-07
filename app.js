'use strict';

//dependencies
var config = require('./config'),
    express = require('express'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    multer  = require('multer'),
    session = require('express-session'),
    mongoStore = require('connect-mongo')(session),
    jade = require('jade'),
    http = require('http'),
    path = require('path'),
    mongoose = require('mongoose'),
    helmet = require('helmet'),
    passport = require('passport');

//create express app
var app = express();
//keep reference to config
app.config = config;
//setup the web server
app.server = http.createServer(app);

//setup mongoose
app.db = mongoose.createConnection(config.mongodb.uri);
app.db.on('error', console.error.bind(console, 'mongoose connection error: '));
app.db.once('open', function () {});

//settings
app.disable('x-powered-by');
//app.set('port', config.port);
app.set('views', path.join(__dirname, 'modules/templates'));
app.set('view engine', 'jade');

//middleware
app.use(require('morgan')('dev'));
app.use(require('compression')());
app.use(multer({ dest: './public/img'}));
app.use(require('serve-static')(path.join(__dirname, 'public')));
app.use(require('method-override')());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(config.cryptoKey));
app.clearStore = function(req){
    if ((req.signedCookies && req.signedCookies['connect.sid']) ||(req.cookies && req.cookies['connect.sid'])) {
        req.app.db.models.Store.remove({_id: req.signedCookies['connect.sid'] || req.cookies['connect.sid']});
    }
};
app.get('/state', function (req, res) {
    function clear() {
        res.clearCookie('provision');
    }
    req.app.clearStore(req);
    res.cookie('connect.sid', '', {expires: new Date( Date.now() + 1000 * 30), path: '/' });
    function sendFalse() { res.json({ msg: 'This is NOT an authorized machine or browser for Attendance Tracking.' }); }
    if (req.signedCookies.provision) {
        var ref = JSON.parse(req.signedCookies.provision).ref;
        req.app.db.models.AttendanceSystem.findOne({ referenceNumber: ref }, function (e, t) {
            if (t && t.status == 'Active') res.json({ success: true });
            else sendFalse();
        });
    } else return sendFalse();
});
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: config.cryptoKey,
    //cookie: {httpOnly: true, maxAge: 30 * 60000},
    //rolling: true,
    store: new mongoStore({ url: config.mongodb.uri })
}));

app.use(passport.initialize());
app.use(passport.session(
    //{
    //    cookie: {httpOnly: true, maxAge: 1 * 60 * 1000}
    //    //cookie: {httpOnly: true, maxAge: 600000}
    //}
));
//app.use(csrf({ cookie: { signed: true } }));
helmet(app);

//response locals
app.use(function (req, res, next) {
    //res.cookie('_csrfToken', req.csrfToken());
    res.locals.user = {};
    res.locals.user.defaultReturnUrl = req.user && req.user.defaultReturnUrl();
    res.locals.user.username = req.user && req.user.username;
    next();
});

//global locals
app.locals.projectName = app.config.projectName;
app.locals.copyrightYear = new Date().getFullYear();
app.locals.copyrightName = app.config.companyName;
app.locals.cacheBreaker = 'br34k-01';
app.appVersion = require('./package.json').version;
app.templates = {
    query: jade.compileFile(__dirname + '/modules/templates/kenna/query.jade', {
        filename: 'query',
        cache: true
    }),
    vacation: jade.compileFile(__dirname + '/modules/templates/kenna/vacation.jade', {
        filename: 'query',
        cache: true
    }),
    attendance: jade.compileFile(__dirname + '/modules/templates/kenna/attendance.jade', {
        filename: 'query',
        cache: true
    }),
    confirmation: jade.compileFile(__dirname + '/modules/templates/kenna/confirmation.jade', {
        filename: 'query',
        cache: true
    })
};
app.constants = require('./public/javascripts/constants.json');

require('./util/kenna/prototypes');
require('./logger');
//setup modules
require('./modules/system/module')(app, mongoose);

require('./util/migration')(app);

//non service routes
app.get('*', function (req, res, next) {
    var clientroutes = ['', 'profile', 'card','cards', 'cash', 'leave', 'calendar', 'employees', 'exited', 'reset',
        'super', 'docs', 'subcash', 'cashlist', 'approvedcash', 'configureleave', 'holidays',
        'leavecalender', 'allocateleave', 'subleave', 'appraisal', 'performancebenchmark',
        'selfappraisal', 'hrassessment', 'hrappraisal', 'hrcompetence', 'hrevaluation',
        'hrperformance', 'hrappraisalsum', 'hrdiscipline', 'hrconfirmation',
        'setup/kra', 'setup/assessment', 'setup/competence','setup/confirmation' ,'setup/evaluation',
        'setup/initiate','setup/iconfirmation' , 'confirmation','confirmationiv',
        'assessment', 'competence', 'discipline', 'subfeedback', 'evaluatesup',
        'testpage', 'performance' ,'setup/delegationlist',
        'subappraisal', 'subcompetence', 'subperformance', 'subdiscipline', 'subattendance',
        'assets', 'assets/location', 'assets/type', 'myassets', 'mytickets','hrassets' ,'system/list',
        'training', 'department', 'quote', 'attendance', 'cashreport', 'hrattendance', 'attendancereport',
        'casereports', 'cases', 'mycases', 'definecase'
    ];var path = req.path.substring(1);
    res.set('Last-Modified', new Date().toUTCString());
    if (clientroutes.indexOf(path.toLowerCase()) >= 0){
        if(req.user && req.user.username && req.user.employee && req.isAuthenticated())
            res.sendFile('home.html', { root: './views' });
        else {
            req.session.destroy(function(){
                req.app.clearStore(req);
                res.cookie('connect.sid', '', {expires: new Date( Date.now() + 1000 * 30), path: '/' });
                res.sendFile('login.html', {root: './views'});
            });
        }
    }
    else next();
});
app.get('/img/*', function(req,res){
    res.sendFile('profile.png', {root: './public/images'});
});
//custom (friendly) error handler
var errors = require('./errors');
app.all('*', errors.http404);
app.use(errors.http500);

//setup utilities
app.kenna = require('./util/kenna/utilityfunctions');
app.utility = {
    sendmail: require('./util/sendmail'),
    slugify: require('./util/slugify'),
    workflow: require('./util/workflow'),
    auto: require('./util/kenna/automated')(app),
    attendance: require('./util/kenna/attendance'),
    notify: require('./util/kenna/notification')(app),
    download: require('./util/kenna/downloadfile'),
    appraisal: require('./util/kenna/appraisal')(app)
};
require('./util/kenna/attTimer')(app);

//listen up
app.server.listen(app.config.port, function () {});

'use strict';
/**
 *
 * @param (Object) app
 * The server object
 * @param (Object) mongoose
 * The mongoose object
 */
module.exports = function (app, mongoose) {
    var LocalStrategy = require('passport-local').Strategy,
        passport = require('passport');
    require('./models')(app, mongoose);
    require('./config')(app.config);

    passport.use(new LocalStrategy(
        function (username, password, done) {
            var conditions = { isActive: 'yes' };
            if (username.indexOf('@') === -1) {
                conditions.username = username;
            }
            else {
                conditions.email = username.toLowerCase();
            }

            app.db.models.User.findOne(conditions, function (err, user) {
                if (err) {
                    return done(err);
                }

                if (!user) {
                    return done(null, false, { message: 'Unknown user' });
                }

                app.db.models.User.validatePassword(password, user.password, function (err, isValid) {
                    if (err) {
                        return done(err);
                    }

                    if (!isValid) {
                        return done(null, false, { message: 'Invalid password' });
                    }
                    app.db.models.Employee.findOne({employeeId: user.username, status: {$ne: 'Inactive'}}, function(e,u){
                       if(e || !u) return done(null, false, {message: 'Invalid user'});
                        else return done(null, user);
                    });
                });
            });
        }
    ));

    passport.serializeUser(function (user, done) {
        var store = new app.db.models.Store({
            user: user.id,
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24)
        });
        store.save(function(e){
            done(null, store._id);
        });
        //done(null, user._id);
    });

    //passport.serializeUser(function (user, done) {
    //    done(null, user._id);
    //});
    //passport.deserializeUser(function (id, done) {
    //    app.db.models.User.findOne({ _id: id }).populate('employee').exec(function (err, user) {
    //        if (user) user.employee.populate('department', function (er) { done(er, user);});
    //        else done(err, user);
    //    });
    //});
    passport.deserializeUser(function(id, done){
        app.db.models.Store.findOne({_id: id, expires: {$gte: new Date()}}, function(e, store){
            if(store){
                app.db.models.User.findOne({ _id: store.user }).populate('employee').exec(function (err, user) {
                    if (user) user.employee.populate('department', function (er) { done(er, user);});
                    else done(err, user);
                });
            } else done(e, null);
        });
    });
    require('./acl')(app);
    var controller = require('./controller.js');

    app.get('/user', controller.currentUser);
    app.post('/login/', controller.login);
    app.get('/logout/', controller.logout);
    //app.post('/signup/', controller.signup);
    //app.post('/forgot/', controller.forgot);
    //app.put('/login/reset/:email/:token/', controller.reset);

    app.get('/organisations/', controller.getOrganisations);
    app.put('/organisations/', controller.saveOrganisation);
    app.post('/organisations/', controller.saveOrganisation);
    app.delete('/organisations/:id', controller.deleteOrganisation);

    app.all('/account*', app.ensureAuthenticated);
    app.all('/admin*', app.ensureAdmin);
    app.all('/appraisal/*', app.ensureAdmin);
    app.all('/appraisaldata/*', app.ensureAuthenticated);
    app.all('/employee*', app.ensureAuthenticated);
    app.all('/employee/allrequest*', app.ensureCashApproval);

    app.get('/account/', controller.profile);
    app.put('/account/', controller.updateProfile);
    //app.post('/account/verification/', controller.sendVerification);
    //app.get('/account/verification/:token/', controller.verify);
    app.put('/account/password/', controller.setpassword);

    //app.get('/admin/users/', controller.listUsers);
    //app.post('/admin/users/', controller.createUser);
    //app.get('/admin/users/:id/', controller.getUser);
    app.put('/admin/users/:id/', controller.updateUser);
    app.put('/admin/reset/:id', controller.resetEmployeePassword);
    app.put('/admin/users/:id/password/', controller.resetPassword);
    //app.delete('/admin/users/:id/', controller.deleteUser);

    app.get('/admin/employees', controller.getUsersPlusRequest);
    app.get('/admin/admin-groups/', controller.listGroups);
    app.post('/admin/admin-groups/', controller.createGroup);
    app.get('/admin/admin-groups/:id/', controller.getGroup);
    app.put('/admin/admin-groups/:id/', controller.updateGroup);
    app.delete('/admin/admin-groups/:id/', controller.deleteGroup);


    app.post('/employee/holiday', controller.saveHoliday);
    
    app.get('/employee/requests', controller.getRequests);
    app.get('/employee/subrequests', controller.getSubRequests);
    app.get('/employee/allrequests', controller.getAllRequests);
   
    app.get('/employee/superiors', controller.getSuperiors);
    app.get('employee/subordinates', controller.getSubordinates);
    app.get('/employee/supervisors', controller.getSupervisors);
    app.post('/employee/supervisors', controller.addSupervisorSubs);

    app.get('/employee/holiday', controller.getHolidays);
    app.post('/employee/holiday', controller.saveHoliday);

    app.get('/employee/holidayEvent', controller.getEvents);
    app.get('/employee/allEvents', controller.getAllEvents);
    app.get('/employee/myevents', controller.getEmployeeEvents);
    
    app.get('/appraisal/appraisallevels', controller.setupPerformanceLevel);

    app.get('/appraisal/scoringp', controller.getScoringLevels);
    app.get('/appraisal/scoringp', controller.getAppraisalLevels);
    app.get('/data/employees', app.ensureAuthenticated, controller.getEmployees);

    require('../appraisal/module')(app, mongoose);
    require('../attendance/module')(app, mongoose);
    require('../case/module')(app, mongoose);
    require('../delegation/module')(app, mongoose);
    require('../download/module')(app, mongoose);
    require('../employee/module')(app, mongoose);
    require('../facility/module')(app, mongoose);
    require('../finance/module')(app, mongoose);
    require('../messaging/module')(app, mongoose);
    require('../query/module')(app, mongoose);
    require('../quote/module')(app, mongoose);
    require('../training/module')(app, mongoose);
    require('../vacation/module')(app, mongoose);

    app.all('/status/version', controller.getVersion);
};

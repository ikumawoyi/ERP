/**
 * Created by toluogunremi on 3/12/15.
 */
'use strict';
var constants = require('../../public/javascripts/constants.json');
module.exports = function (app, mongoose) {
    var ObjectId = mongoose.Schema.Types.ObjectId;
    //user
    var userSchema = new mongoose.Schema({
        username: { type: String, unique: true },
        password: String,
        email: { type: String, unique: true },
        employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        roles: {
            admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
            account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }
        },
        isActive: Boolean,
        timeCreated: { type: Date, default: Date.now },
        resetPasswordToken: String,
        resetPasswordExpires: Date
    });
    userSchema.methods.canPlayRoleOf = function (role) {
        if (role === "admin" && this.roles.admin) {
            return true;
        }

        if (role === "account" && this.roles.account) {
            return true;
        }

        return false;
    };
    userSchema.methods.defaultReturnUrl = function () {
        var returnUrl = '/';
        /*if (this.canPlayRoleOf('account')) {
         returnUrl = '/account/';
         }

         if (this.canPlayRoleOf('admin')) {
         returnUrl = '/admin/';
         }
         */
        return returnUrl;
    };
    userSchema.statics.encryptPassword = function (password, done) {
        var bcrypt = require('bcrypt-nodejs');
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return done(err);
            }

            bcrypt.hash(password, salt, null, function (err, hash) {
                done(err, hash);
            });
        });
    };
    userSchema.statics.validatePassword = function (password, hash, done) {
        var bcrypt = require('bcrypt-nodejs');
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
            }
            bcrypt.hash(password, salt, null, function (err, hash) {
            });
        });

        bcrypt.compare(password, hash, function (err, res) {
            done(err, res);
        });
    };
    userSchema.index({ username: 1 }, { unique: true });
    userSchema.index({ email: 1 }, { unique: true });
    userSchema.index({ timeCreated: 1 });
    userSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('User', userSchema);
    console.log(app.get('env') + ' - ' + app.appVersion);
    //admin
    var adminSchema = new mongoose.Schema({
        user: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String, default: '' }
        },
        name: {
            full: { type: String, default: '' },
            first: { type: String, default: '' },
            middle: { type: String, default: '' },
            last: { type: String, default: '' }
        },
        groups: [{ type: String, ref: 'AdminGroup' }],
        permissions: [{
            name: String,
            permit: Boolean
        }],
        timeCreated: { type: Date, default: Date.now }
    });
    adminSchema.methods.hasPermissionTo = function (something) {
        //check group permissions
        var groupHasPermission = false;
        for (var i = 0 ; i < this.groups.length ; i++) {
            for (var j = 0 ; j < this.groups[i].permissions.length ; j++) {
                if (this.groups[i].permissions[j].name === something) {
                    if (this.groups[i].permissions[j].permit) {
                        groupHasPermission = true;
                    }
                }
            }
        }

        //check admin permissions
        for (var k = 0 ; k < this.permissions.length ; k++) {
            if (this.permissions[k].name === something) {
                if (this.permissions[k].permit) {
                    return true;
                }
                return false;
            }
        }

        return groupHasPermission;
    };
    adminSchema.methods.isMemberOf = function (group) {
        for (var i = 0 ; i < this.groups.length ; i++) {
            if (this.groups[i]._id === group) {
                return true;
            }
        }

        return false;
    };
    adminSchema.index({ 'user.id': 1 });
    adminSchema.index({ 'name.full': 1 });
    adminSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('Admin', adminSchema);

    //admin group
    var adminGroupSchema = new mongoose.Schema({
        _id: { type: String },
        name: { type: String, default: '' },
        permissions: [{ name: String, permit: Boolean }]
    });
    adminGroupSchema.index({ name: 1 }, { unique: true });
    adminGroupSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('AdminGroup', adminGroupSchema);

    //account
    var accountSchema = new mongoose.Schema({
        user: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String, default: '' }
        },
        isVerified: { type: String, default: '' },
        verificationToken: { type: String, default: '' },
        name: {
            first: { type: String, default: '' },
            middle: { type: String, default: '' },
            last: { type: String, default: '' },
            full: { type: String, default: '' }
        },
        company: { type: String, default: '' },
        phone: { type: String, default: '' },
        zip: { type: String, default: '' },
        userCreated: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String, default: '' },
            time: { type: Date, default: Date.now }
        }
    });
    accountSchema.index({ user: 1 });
    accountSchema.index({ 'status.id': 1 });
    accountSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('Account', accountSchema);

    //login attempt
    var attemptSchema = new mongoose.Schema({
        ip: { type: String, default: '' },
        user: { type: String, default: '' },
        time: { type: Date, default: Date.now, expires: app.config.loginAttempts.logExpiration }
    });
    attemptSchema.index({ ip: 1 });
    attemptSchema.index({ user: 1 });
    attemptSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('LoginAttempt', attemptSchema);

    //organisation
    var organisationSchema = new mongoose.Schema({
        name: { type: String, default: '', required: { unique: true } },
        orgType: { type: String, default: '', required: true },
        designations: [{ type: String, enum: constants.designations }],
        parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation' }
    });
    app.db.model('Organisation', organisationSchema);
   
   

    var holidaySchema = new mongoose.Schema({
        name: { type: String, required: true },
        start: { type: Date, required: true },
        days: { type: Number, required: true },
        resumption: { type: Date, required: true },
        message: { type: String, default: '' },
        hasImage: { type: Boolean, default: false },
        imagePath: { type: String }
    });
    app.db.model('Holiday', holidaySchema);


    var siteSettingSchema = new mongoose.Schema({
        name: {
            type: String, required: true, unique: true, enum: ['Lateness', 'Early',
                'Absent', 'Performance Scoring', 'Appraisal Level']
        },
        description: { type: String, default: '' },
        value: {}
        //value:{
        //    "excellent":{type:Number, Required:true, default:5},
        //    "very good":4,
        //    "good":3,
        //    "satisfactory":2,
        //    "poor":1
        //}
    });
    app.db.model('SiteSetting', siteSettingSchema);

    var delegationSchema = new mongoose.Schema({
        employee: { type: ObjectId, ref: 'Employee', required: true },
        tasks: [String],
        status: { type: String, required: true },
        modified: { type: Date, default: new Date() }
    });
    delegationSchema.index({ employee: 1, status: 'active' }, { unique: true });
    delegationSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('Delegation', delegationSchema);

    var sessionSchema = new mongoose.Schema({
        _id: String,
        session: String,
        expires: Date
    });
    sessionSchema.index({ _id: 1}, {unique: true});
    app.db.model('Session', sessionSchema)

    var storeSchema = new mongoose.Schema({
        user: String,
        expires: Date
    });
    storeSchema.index({ _id: 1}, {unique: true});
    app.db.model('Store', storeSchema)
};

//Training
//Disciplinary
//Confirmation
//Asset
//Attendance
//Quote of the day
//Cash disbursement summary
//

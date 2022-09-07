//var module = {}; module.exports = {};
module.exports = {
    validate: {
        email: function (item, model) {
            return !(model[item] && !/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(model[item]))
        },
        emailCollection: function (array, model, response) {
            array
                .forEach(function (item) {
                    if (model[item] && !/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(model[item])) {
                        response.outcome.errfor[item] = 'invalid email format';
                    }
                });
        },
        stringCollection: function (array, model, response) {
            array
                .forEach(function (item) {
                    if (model[item] && !/^[a-zA-Z0-9\-\_]+$/.test(model[item]))
                        response.outcome.errfor[item] = 'only letters, \'-\' are allowed';
                });
        },
        required: function () {

        },
        date: function () {

        },
        number: function () {

        },
        link: function () {

        },
        phone: function (item, model) {
            return !(model[item] & !/^[0-9\-\_]+$/.test(model[item]));
        }
    },
    utility: {
        noop: function () { },
        capitalize: function (str) { return str && str[0].toUpperCase() + str.slice(1); },
        getUsername: function (model, whc) {
            return whc ?
            model.firstName.substring(0, 1).toLowerCase() + model.lastName.toLowerCase() :
            model.lastName.substring(0, 1).toLowerCase() + model.firstName.toLowerCase();
        },
        populate: function (output, input, options) {
            var r = output.toObject();
            for (var p in r)
                if (input[p] !== undefined && input[p] !== null && p !== 'id' && p !== '_id')
                    output[p] = input[p];
            if (Array.isArray(options))
                options.forEach(function (p) {
                    if (input[p] !== undefined && input[p] !== null && p !== 'id' && p !== '_id')
                        output[p] = input[p];
                })
        },
        nextDay: function (input, d, e) {
            var end = new Date(input);
            var count = 0;
            while (count < d) {
                end.setDate(end.getDate() + 1);
                if (!e && (end.getDay() == 6 || end.getDay() == 0)) continue;
                count++;
            }
            if (e && (end.getDay() == 6 || end.getDay() == 0)) switch (end.getDay()){
                case 6:
                    end.setDate(end.getDate() + 2);
                    break;
                case 0:
                    end.setDate(end.getDate() + 1);
                    break;
            }
            return end;
        },
        convertEntitlement: function (arr, level) {
            var ent = {};
            arr.forEach(function (item) {
                if (item.level == level)
                    switch (item.name) {
                        case 'Annual Leave':
                            ent.annual = item.days; break;
                        case 'Sick Leave':
                            ent.sick = item.days; break;
                        case 'Casual Leave':
                            ent.casual = item.days; break;
                        default:
                            break;
                    }
            })
            return ent;
        },
        convertEntitlementArrayToObject: function (ents) {
            var level1Col = [], level2Col = [];
            var groups = require('underscore').groupBy(ents, 'level');
            for (var p in groups) {
                if (p == 'Level 1') level1Col = groups[p];
                else if (p == 'Level 2') level2Col = groups[p];
            }
            var result = {
                "Level 1": module.exports.utility.convertEntitlement(level1Col, 'Level 1'),
                "Level 2": module.exports.utility.convertEntitlement(level2Col, 'Level 2')
            }
            return result;
        },
        pad: function (n) {
            var y =
                n < 10 ? ('0000' + n.toString(10)) :
                    n < 100 ? (('000' + n.toString(10))) :
                        n < 1000 ? (('00' + n.toString(10))) :
                            n < 10000 ? (('0' + n.toString(10))) :
                                n.toString(10);
            return y;
        },
        resetTime: function (d) { d.setMinutes(0); d.setSeconds(0); d.setMilliseconds(0); },
        getCurrentPeriod: function (model, cb) {
            model.find(function (err, pers) {
                if (err) cb('Could not retrieve the appraisal period status.');
                else if (pers.length == 0) cb('no Appraisal period found.');
                else {
                    var per = pers[pers.length - 1];
                    var today = new Date(new Date().toDateString());
                    if (today >= per.start && today <= per.end) cb(null, per);
                    else cb('Appraisal is closed');
                }
            });
        },
        getLatestPeriod: function (model, data, cb) {
            if (typeof data == 'function') cb = data;
            model.find(function (err, pers) {
                if (err) cb('Could not retrieve the appraisal period status.', null);  //res.status(500).send('Could not retrieve the appraisal period status.');
                else if (pers.length == 0) cb('No Appraisal period found.', null); // res.status(500).send('no Appraisal period found.');
                else {
                    var per = pers[pers.length - 1];
                    var today = new Date(new Date().toDateString());
                    var res = { isOpen: today >= per.start && today <= per.end, period: per };
                    cb(null, res);
                }
            });
        },
        calculateScore: function (sum, count) {
            var percent = ((sum * 20) / count).toFixed();
            var text = '';
            if (100 >= percent && percent > 80)
                text = 'Exceptional';
            else if (percent <= 80 && percent > 60)
                text = 'Excellent';
            else if (60 >= percent && percent > 40)
                text = 'Very Good';
            else if (40 >= percent && percent > 20)
                text = 'Good';
            else if (20 >= percent && percent >= 0)
                text = 'Satisfactory';
            else return { score: 0, text: null };
            if (count == 0) return { score: 0, text: null };
            else return {
                score: percent, text: text
            }
        },
        calculateArrayScore: function (arr) {
            var count = arr.length; var sum = 0;
            var ref = module.exports.defaultLevels;
            arr.forEach(function (itm) {
                if (ref[itm.toLowerCase()]) { sum += parseInt(ref[itm.toLowerCase()]); }
            });
            return module.exports.utility.calculateScore(sum, count);
        },
        getTime: function (time) {
            time = new Date(time); var hr = time.getHours(); var min = time.getMinutes(); var tt = 12;
            return (tt == 12) ? module.exports.utility.padTime(hr == 0 ? 12 : hr <= 12 ? hr : hr - 12) + ':' + module.exports.utility.padTime(min) + (hr >= 12 ? 'PM' : 'AM') : module.exports.utility.padTime(hr) + ':' + module.exports.utility.padTime(min);
        },
        padTime: function (n) { return n < 10 ? '0' + n.toString(10) : n.toString(10); }
    },
    defaultPlevels: [
        { name: 'Excellent', upper: 100, lower: 80, image: 'blue' },
        { name: 'Very Good', upper: 79, lower: 70, image: 'green' },
        { name: 'Satisfactory Performance', upper: 69, lower: 60, image: 'black' },
        { name: 'Below Expectations', upper: 59, lower: 50, image: 'yellow' },
        { name: 'Unacceptable Performance', upper: 49, lower: 0, image: 'red' }
    ],
    defaultLevels: {
        "exceptional": 5,
        "excellent": 4,
        "very good": 3,
        "good": 2,
        "satisfactory": 1
    },
    defaultAlevels: [
        { name: 'Above Level', value: 100 },
        { name: 'At Level', value: 70 },
        { name: 'Below Level', value: 45 },
        { name: 'N/A', value: 0 }
    ],
    setupRights: function(emp, t, app) {
        t = t || {};
        emp = emp || {};
        if (emp) {
            t.employee = emp;
            t.fullName = emp.fullName();
            var info = {};
            if (emp.access == 'M' || emp.access == 'O') info.isAdmin = true;
            if (emp.department.name == 'Finance') info.isFinance = true;
            if (emp.department.name == 'Information Technology') info.isIT = true;
            if (emp.department.name == 'HR') info.isHR = true;
            if (emp.department.name == 'Counsel') info.isCounsel = true;
            if (emp.department.name == 'Counsel' && app.constants.sCounsels.indexOf(emp.designation) > -1) info.issCounsel = true;
            if (emp.subordinates.length > 0) info.isSuper = true;
            t.info = info;
            var delegated = {};
            if (emp.tasks.indexOf('trn') > -1) delegated.canTrn = true;
            if (emp.tasks.indexOf('fac') > -1) delegated.canFac = true;
            if (emp.tasks.indexOf('emp') > -1) delegated.canEmp = true;
            if (emp.tasks.indexOf('att') > -1) delegated.canAtt = true;
            if (emp.tasks.indexOf('cas') > -1) delegated.canCas = true;
            if (emp.tasks.indexOf('lev') > -1) delegated.canLev = true;
            if (emp.tasks.indexOf('quo') > -1) delegated.canQuo = true;
            if (Object.keys(delegated).length > 0) t.tasks = delegated;
        }
        return t;
    }
};
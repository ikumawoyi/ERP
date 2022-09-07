/**
 * Created by Ubiri Uzoezi on 27/04/2015.
 */
'use strict';
module.exports = function (app) {
    var syt = new (require('events').EventEmitter)();
    syt.on('cashRequestStatusChanged', function (cashRequest, user, sv) {
        cashRequest.preApproval = cashRequest.preApproval || (sv || null);
        var field = new app.db.models.MailMessage({
            sender: user.employee.fullName(),
            senderId: user.employee.id,
            type: 'Cash',
            date: new Date(),
            read: false,
            important: cashRequest.priority == 'Normal',
            isDeleted: false
        });
        var save = true;
        switch (cashRequest.status) {
            case 'Pre-Approval':
                field.title = 'Requisition for fund - ' + cashRequest.description;
                field.text = 'You have a cash request of (₦' + cashRequest.amount + ') from ' + cashRequest.requester + ' awaiting your approval';
                field.moreText = cashRequest.requesterNotes;
                field.recipient = cashRequest.preApproval;
                field.recipientId = cashRequest.toApprove;
                break;
            case 'Disapproved':
                field.title = 'Disapproved cash request';
                field.text = 'Your petty cash request of (₦' + cashRequest.amount + ') was declined by ' + user.employee.fullName();
                field.recipient = cashRequest.requester;
                field.recipientId = cashRequest.employee.id || cashRequest.employee;
                break;
            case 'Awaiting PD\'s Approval':
                field.title = 'Cash Request - ' + cashRequest.description;
                field.text = 'You have a petty cash request from ' + user.employee.fullName()
                + ' awaiting your final approval.';
                field.recipient = 'PD';
                break;
            case 'Approved':
                field.title = 'Approved Cash Request';
                field.text = 'Your petty cash request of (₦' + cashRequest.amount + ') has been approved.';
                field.recipient = cashRequest.requester;
                field.recipientId = cashRequest.employee.id || cashRequest.employee;
                var t = new app.db.models.MailMessage({
                    sender: user.employee.fullName(),
                    senderId: user.employee.id,
                    type: 'Cash',
                    date: new Date(),
                    read: false,
                    important: cashRequest.priority == 'Normal',
                    isDeleted: false,
                    recipient: 'Finance',
                    title: 'Approved Cash Request',
                    text: 'Petty cash request of (₦' + cashRequest.amount + ') has been approved for '
                    + cashRequest.requester
                });
                t.save();
                break;
            case 'Cash Released':
                save = false;
                field.title = 'Cash Released';
                field.text = 'Cash has been released for ' + cashRequest.requester;
                field.recipient = 'PD';
                //field.recipientId = cashRequest.employee.id || cashRequest.employee.id ;
                break;
            case 'Retired':
                save = false;
                field.title = 'Cash Request Retired';
                field.text = 'Cash request for ' + cashRequest.requester + ' has been retired';
                field.recipient = 'PD';
                break;
            default: save = false; break;
        }
        if (save) field.save();
    });
    syt.on('leaveRequestStatusChanged', function (lR, user, m) {
        function getLeaveType(type, gender) {
            var parArray = { 'Male': 'Paternity', 'Female': 'Maternity' };
            return (type == 'Parenting' ? parArray[gender] || type : type) + ' leave';
        }
        var field = new app.db.models.MailMessage({
            sender: user.employee.fullName(),
            senderId: user.employee.id,
            type: 'Leave',
            date: new Date(),
            read: false,
            important: true,
            isDeleted: false
        });
        var type = getLeaveType(lR.type, user.employee.gender);
        var save = true;
        switch (lR.status) {
            case 'Pre-Approval': // LR, user, superName
                field.title = 'Request for ' + type;
                field.text = 'You have a pending ' + type + ' from ' + lR.requester + ' awaiting your approval';
                field.recipient = m.fullName();
                field.recipientId = lR.toApprove;
                break;
            case 'Disapproved': //LR, user
                field.title = 'Disapproved ' + type + ' request';
                field.text = 'Your ' + type + ' request was declined by ' + user.employee.fullName();
                field.recipient = lR.requester;
                field.recipientId = lR.employee.id || lR.employee;
                break;
            case 'Approved': //LR, user, employee
                if (lR.byAdmin) {
                    field.title = 'Leave calender updated';
                    field.text = 'Your leave calender has been updated with ' + type + ' request of ' + lR.days + ' day' + (lR.days > 1 ? 's from' : ' on') + lR.start.toDateString();
                    field.recipient = lR.requester;
                    field.recipientId = lR.employee.id || lR.employee;
                } else {
                    field.title = 'Approved ' + type + ' request';
                    field.text = 'Your ' + type + ' request of ' + lR.days + ' day' + (lR.days > 1 ? 's from' : ' on') + lR.start.toDateString() + ' has been approved.';
                    field.recipient = lR.requester;
                    field.recipientId = lR.employee.id || lR.employee;
                    var t = new app.db.models.MailMessage({
                        sender: user.employee.fullName(),
                        senderId: user.employee.id,
                        type: 'Leave',
                        date: new Date(),
                        read: false,
                        important: true,
                        isDeleted: false,
                        recipient: 'PD',
                        title: 'Approved ' + type + ' request',
                        text: type + ' request of ' + lR.days + ' day' + (lR.days > 1 ? 's from' : ' on')
                        + lR.start.toDateString() + ' has been approved for ' +
                        +lR.requester + '.'
                    });
                    t.save();
                }
                break;
            default: save = false;
        }
        if (save) field.save(function () {
            if (lR.status == 'Pre-Approval') {
                var h = app.templates.vacation({
                    username: field.recipient,
                    title: field.title,
                    message: field.text,
                    link: 'http://counsel.kennapartners.com/subleave',
                    linkText: 'view',
                    sender: 'Leave Manager'
                });
                sendExternalMail(field, m.wEmail || m.pEmail, null, h);
            }
        });
    });
    syt.on('assetSupportRequest', function (ticket, asset, user) {
        var field = new app.db.models.MailMessage({
            recipient: 'Support Team',
            many: {
                department: asset.type.department,
                designations: asset.type.designations
            },
            sender: user.employee.fullName(),
            senderId: user.employee.id,
            title: 'Support Request for ' + asset.description,
            text: 'A support request was been made for ' +
                asset.type.name + '(' + (asset.displayName || asset.code) +
                ') located at ' + asset.location.name,
            moreText: ticket.description,
            type: 'Support',
            date: new Date(),
            read: false,
            important: ticket.priority == 'High',
            isDeleted: false
        });
        field.save();
    });
    syt.on('assetSupportReply', function (ticket, asset, user) {
        var field = new app.db.models.MailMessage({
            recipient: 'Support Team',
            many: {
                department: asset.type.department,
                designations: asset.type.designations
            },
            sender: user.employee.fullName(),
            senderId: user.employee.id,
            title: 'Support Replied for ' + asset.description,
            text: 'The support ticket for ' +
            asset.type.name + '(' + (asset.displayName || asset.code) +
            ') located at ' + asset.location.name + ' has been closed.',
            moreText: ticket.reply,
            type: 'Support',
            date: new Date(),
            read: false,
            important: ticket.priority == 'High',
            isDeleted: false
        });
        field.save();
    });
    syt.on('confirmationRequest', function (emp, appr) {
        var field = new app.db.models.MailMessage({
            recipient: appr.fullName(),
            recipientId: appr.id,
            sender: 'Appraisal Manager',
            title: 'Confirmation Appraisal - ' + emp.fullName(),
            text: 'Please complete ' + emp.fullName() + ' confirmation appraisal',
            type: 'Confirmation',
            date: new Date(),
            read: false,
            important: true,
            isDeleted: false
        });
        field.save(function () {
            var html = app.templates.confirmation({
                username: field.recipient,
                title: field.title,
                message: field.text,
                link: 'http://counsel.kennapartners.com/confirmationiv',
                linkText: 'view',
                sender: 'Appraisal Manager'
            });
            sendExternalMail(field, appr.wEmail || appr.pEmail, null, html);
        });
    });
    syt.on('trainingSetup', function (trx) {
        var async = require('async');
        trx.populate('invited', function () {
            async.each(
                trx.invited,
                function (emp, cb) {
                    var field = new app.db.models.MailMessage({
                        recipient: emp.fullName(),
                        recipientId: emp.id,
                        sender: 'Training Manager',
                        title: 'Training Invitation - ' + trx.title,
                        text: 'You have been invited for a training (' + trx.title
                            + ') schedule for ' + trx.date.toDateString() + ' from '
                            + trx.startDate + ' to ' + trx.endTime,
                        moreText: 'You have been invited for a training (' + trx.title
                            + ') schedule for ' + trx.date.toDateString() + ' from '
                            + trx.startDate + ' to ' + trx.endTime,
                        type: 'Training',
                        date: new Date(),
                        read: false,
                        important: true,
                        isDeleted: false
                    });
                    field.save(function () { cb(); })
                },
                function (err) { });
        });
    });
    syt.on('queryInitiated', function (query, user, cb) {
        query.populate('copied employee', function () {
            var field = new app.db.models.MailMessage({
                recipient: query.employee.fullName(),
                recipientId: query.employee.id,
                sender: user.employee.fullName(),
                title: 'Query - ' + query.subject,
                moreText: "Kindly complete your query ",
                type: 'Query',
                text: "Kindly complete your <a href='query/" + query.id + "' class='btn btn-link'>query</a>",
                date: new Date(),
                read: false,
                important: true,
                isDeleted: false
            });
            field.save(function (e) {
                if (e) return cb(e);
                var html = app.templates.query({
                    username: field.recipient,
                    title: field.title,
                    message: field.moreText,
                    link: 'http://counsel.kennapartners.com/discipline',
                    linkText: 'query',
                    sender: 'Query Manager'
                });
                if (html) {
                    sendExternalMail(field, query.employee.wEmail || query.employee.pEmail, query.copied.map(function (i) { return i.wEmail || i.pEmail; }), html);
                }
                cb();
            });
        });
    });
    syt.on('assignedCase', function (caseInfo, emps, user) {
       var async = require('async');
        async.each(emps, function(id, cb){
            app.db.models.Employee.findById(id,'wEmail pEmail firstName lastName', function(e, emp){
                var field = new app.db.models.MailMessage({
                    recipient: emp.fullName(),
                    recipientId: emp.id,
                    sender: user.employee.fullName(),
                    title: 'Case - ' + query.subject,
                    moreText: "Kindly complete your query ",
                    type: 'Query',
                    text: "Kindly complete your <a href='query/" + query.id + "' class='btn btn-link'>query</a>",
                    date: new Date(),
                    read: false,
                    important: true,
                    isDeleted: false
                });
            })
        });
        query.populate('copied employee', function () {

            field.save(function (e) {
                if (e) return cb(e);
                var html = app.templates.case({
                    username: field.recipient,
                    title: field.title,
                    message: field.moreText,
                    link: 'http://counsel.kennapartners.com/cases',
                    linkText: 'query',
                    sender: 'Query Manager'
                });
                if (html) {
                    sendExternalMail(field, query.employee.wEmail || query.employee.pEmail, query.copied.map(function (i) { return i.wEmail || i.pEmail; }), html);
                }
                cb();
            });
        });
    });
    syt.on('requeryUnreplied', function (q) {
        app.db.models.DisciplinaryAction
            .findById(q.id)
            .populate('employee issuedBy copied', 'firstName lastName wEmail pEmail')
            .exec(function (err, query) {
                console.log(query);
                if(query) {
                    var field = new app.db.models.MailMessage({
                        recipient: query.employee.fullName(),
                        recipientId: query.employee.id,
                        sender: query.issuedBy.fullName(),
                        title: 'Unreplied Query - ' + query.subject,
                        moreText: "Kindly respond to your pending ",
                        type: 'Query',
                        text: "Kindly respond to your pending<a href='query/" + query.id + "' class='btn btn-link'>query</a>",
                        date: new Date(),
                        read: false,
                        important: true,
                        isDeleted: false
                    });
                    field.save(function (e) {
                        if (e) return console.log('Could not requery due to an error.',e );
                        var html = app.templates.query({
                            username: field.recipient,
                            title: field.title,
                            message: field.moreText,
                            link: 'http://counsel.kennapartners.com/discipline',
                            linkText: 'query',
                            sender: 'Query Manager'
                        });
                        if (html) {
                            sendExternalMail(field, query.employee.wEmail || query.employee.pEmail, query.copied.map(function (i) {
                                return i.wEmail || i.pEmail;
                            }), html);
                        }
                    });
                }
        });
    });
    syt.on('repliedQuery', function (query) {
        query.populate('copied employee issuedBy', function () {
            var field = new app.db.models.MailMessage({
                recipient: query.issuedBy.fullName(),
                recipientId: query.issuedBy.id,
                sender: query.employee.fullName(),
                title: 'Re: Query - ' + query.subject,
                moreText: query.employee.fullName() + " has responded to your ",
                type: 'Query',
                text: query.employee.fullName() + " has responded to your <a href='queryres/" + query.id + "' class='btn btn-link'>query</a>",
                date: new Date(),
                read: false,
                important: true,
                isDeleted: false
            });
            field.save(function (e) {
                var html = app.templates.query({
                    username: field.recipient,
                    title: field.title,
                    message: field.moreText,
                    link: 'http://counsel.kennapartners.com/subdiscipline',
                    linkText: 'query',
                    sender: 'Query Manager'
                });
                if (html && !e) {
                    sendExternalMail(field, query.issuedBy.wEmail || query.issuedBy.pEmail, query.copied.map(function (i) { return i.wEmail || i.pEmail; }), html);
                }
            });
        });
    });
    syt.on('absentPrompt', function (emp) {
        if (emp.supervisor) {
            var field = new app.db.models.MailMessage({
                recipientId: emp.supervisor,
                recipient: emp.supervisor.fullName(),
                sender: 'Attendance Manager',
                title: 'Absent Notification - ' + emp.fullName(),
                text: 'Please note that ' + emp.fullName() + ' is absent today',
                type: 'Attendance',
                date: new Date(),
                read: false,
                important: true,
                isDeleted: false
            });
            field.save(function () {
                if (app.pd) {
                    var f = new app.db.models.MailMessage({
                        recipientId: app.pd.id,
                        recipient: app.pd.fullName(),
                        sender: 'Attendance Manager',
                        title: 'Absent Notification - ' + emp.fullName(),
                        text: 'Please note that ' + emp.fullName() + ' is absent today',
                        type: 'Attendance',
                        date: new Date(),
                        read: false,
                        important: true,
                        isDeleted: false
                    });
                    f.save(function () {
                        var html = app.templates.attendance({
                            username: f.recipient,
                            title: f.title,
                            message: f.text,
                            link: 'http://counsel.kennapartners.com/hrattendance',
                            linkText: 'view',
                            sender: 'Attendance Manager'
                        });
                        sendExternalMail(f, app.pd.wEmail || app.pd.pEmail, null, html);
                    });
                }
                var html = app.templates.attendance({
                    username: field.recipient,
                    title: field.title,
                    message: field.text,
                    link: 'http://counsel.kennapartners.com/subattendance',
                    linkText: 'view',
                    sender: 'Attendance Manager'
                });
                sendExternalMail(field, emp.supervisor.wEmail || emp.supervisor.pEmail, null, html);
            });
        }
    });
    syt.on('latenessPrompt', function (emp) {
        if (emp.supervisor) {
            var field = new app.db.models.MailMessage({
                recipientId: emp.supervisor,
                recipient: emp.supervisor.fullName(),
                sender: 'Attendance Manager',
                title: 'Lateness Notification - ' + emp.fullName(),
                text: 'Please note that ' + emp.fullName() + ' arrives late today',
                type: 'Attendance',
                date: new Date(),
                read: false,
                important: true,
                isDeleted: false
            });
            field.save(function () {
                if (app.pd) {
                    var f = new app.db.models.MailMessage({
                        recipientId: app.pd.id,
                        recipient: app.pd.fullName(),
                        sender: 'Attendance Manager',
                        title: 'Lateness Notification - ' + emp.fullName(),
                        text: 'Please note that ' + emp.fullName() + ' arrives late today',
                        type: 'Attendance',
                        date: new Date(),
                        read: false,
                        important: true,
                        isDeleted: false
                    });
                    f.save(function () {
                        var h = app.templates.attendance({
                            username: f.recipient,
                            title: f.title,
                            message: f.text,
                            link: 'http://counsel.kennapartners.com/hrattendance',
                            linkText: 'view',
                            sender: 'Attendance Manager'
                        });
                        sendExternalMail(field,  app.pd.wEmail ||   app.pd.pEmail, null, h);
                    });
                }
                var html = app.templates.attendance({
                    username: field.recipient,
                    title: field.title,
                    message: field.text,
                    link: 'http://counsel.kennapartners.com/subattendance',
                    linkText: 'view',
                    sender: 'Attendance Manager'
                });
                sendExternalMail(field, emp.supervisor.wEmail ||  emp.supervisor.pEmail, null, html);
            });
        }
    });
    syt.on('devNotify', function(type){
        var opts = {
            username: 'Uzoezi Ubiri',
            link: 'http://counsel.kennapartners.com',
            sender: 'Process Manager'
        };
    var date =  new Date();
        switch (type){
            case 'restart':
                opts.title = 'Kenna Server('+ app.appVersion+') was restarted at  - ' + date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                opts.message = 'Please note that Kenna Server was restarted at  - ' + date.toLocaleDateString() + ' ' + date.toLocaleTimeString() + '.\nVersion: '+ app.appVersion;
                break;
            case 'newDay':
                opts.title = 'Kenna Server recycled at  - ' + date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                opts.message = 'Please note that Kenna Server was recycled at  - ' + date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                break;
            default :
        }
        sendExternalMail({title: opts.title, text: opts.message}, 'uzeex2@gmail.com', null, app.templates.attendance(opts));
    });
    setTimeout(function () {syt.emit('devNotify', 'restart');}, 3000);
    function sendExternalMail(msg, rec, bcc, html) {
        var emailjs = require('emailjs/email');
        var emailer = emailjs.server.connect(app.config.smtp.credentials);
        var eMsg = {
            from: app.config.smtp.from.name + ' <' + app.config.smtp.from.address + '>',
            to: rec,
            subject: msg.title,
            attachment: []
        };
        if (html) {
            eMsg.text = html;
            eMsg.attachment.push({ data: html, alternative: true });
        } else eMsg.text = msg.moreText || msg.text;
        if (bcc) eMsg.cc = bcc;
        console.log('About to send: ' + eMsg.from + ' || ' + app.config.smtp.credentials.user + ' || ' + eMsg.to + (bcc?( ' || ' + bcc ):''));
        return ;
        emailer.send(eMsg, function (err, message) {
            if (err) {
                console.log('Email sending failed. ' + err);
                logFailed(message);
            }
            else {
                console.log('Email succesfully sent');
                logSent(message);
            }
        });
    }
    function logSent(message) {
        var m = new app.db.models.OutMessage({
            from: message.from || message.header.from,
            to: message.to || message.header.to,
            content: message.text || message.header.text,
            cc: message.cc || message.header.cc,
            bcc: message.bcc || message.header.bcc,
            subject: message.subject || message.header.subject,
            status: 'Sent',
            date: new Date(),
            data: JSON.stringify(message)
        });
        m.save();
    }
    function logFailed(message) {
        try {
            var m = new app.db.models.OutMessage({
                from: message.from || message.header.from,
                to: message.to || message.header.to,
                content: message.text || message.header.text,
                cc: message.cc || message.header.cc,
                bcc: message.bcc || message.header.bcc,
                subject: message.subject || message.header.subject,
                status: 'Failed',
                date: new Date(),
                data: JSON.stringify(message)
            });
            m.save();
        }
        catch(e){}
    }
    return syt;
};
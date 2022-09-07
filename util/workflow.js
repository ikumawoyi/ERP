/**
 * Created by toluogunremi on 3/12/15.
 */
'use strict';

module.exports = function(req, res) {
    var workflow = new (require('events').EventEmitter)();

    workflow.outcome = {
        success: false,
        errors: [],
        errfor: {}
    };

    workflow.hasErrors = function() {
        return Object.keys(workflow.outcome.errfor).length !== 0 || workflow.outcome.errors.length !== 0;
    };

    workflow.on('exception', function(err) {
        workflow.outcome.errors.push('Exception: '+ err);
        console.log('Exception: ', err);
        return workflow.emit('response');
    });

    workflow.on('response', function() {
        workflow.outcome.success = !workflow.hasErrors();
        res.send(workflow.outcome);
    });

    workflow.on('cashRequestStatusChangedR', function(cashRequest, sv){
        cashRequest.preApproval = cashRequest.preApproval || ( sv || null );
        var field = new req.app.db.models.MailMessage({
            sender:req.user.employee.fullName(),
            senderId:req.user.employee.id,
            type:'Cash',
            date: new Date(),
            read: false,
            important: cashRequest.priority == 'Normal',
            isDeleted:false
        });
        var save = true;
        switch (cashRequest.status){
            case 'Pre-Approval':
                field.title = 'Requisition for fund - ' + cashRequest.description;
                field.text = 'You have a cash request of (&#x20A6'+ cashRequest.amount + ') from '+ cashRequest.requester + 'awaiting your approval';
                field.moreText = cashRequest.requesterNotes;
                field.recipient = cashRequest.preApproval;
                field.recipientId = cashRequest.toApprove;
                break;
            case  'Disapproved':
                field.title = 'Disapproved cash request';
                field.text = 'Your petty cash request of (&#x20A6'+ cashRequest.amount + ') was declined by '+ req.user.employee.fullName();
                field.recipient = cashRequest.requester;
                field.recipientId = cashRequest.employee.id || cashRequest.employee.id ;
                break;
            case  'Awaiting PD\'s Approval':
                field.title = 'Cash Request - ' + cashRequest.description;
                field.text = 'You have a petty cash request from '+ req.user.employee.fullName()
                + ' awaiting your final approval.';
                field.recipient = 'PD';
                break;
            case 'Approved':
                field.title = 'Approved Cash Request';
                field.text = 'Your petty cash request of (&#x20A6'+ cashRequest.amount + ') has been approved.';
                field.recipient = cashRequest.requester;
                field.recipientId = cashRequest.employee.id || cashRequest.employee.id ;
                var t = new req.app.db.models.MailMessage({
                    sender: req.user.employee.fullName(),
                    senderId:req.user.employee.id,
                    type:'Cash',
                    date: new Date(),
                    read: false,
                    important: cashRequest.priority == 'Normal',
                    isDeleted:false,
                    recipient: 'Finance',
                    title: 'Approved Cash Request',
                    text: 'Petty cash request of (&#x20A6'+ cashRequest.amount + ') has been approved for '
                    + cashRequest.requester
                });
                t.save();
                break;
            case  'Cash Released':
                save = false;
                field.title = 'Cash Released';
                field.text = 'Cash has been released for ' + cashRequest.requester;
                field.recipient = 'PD';
                //field.recipientId = cashRequest.employee.id || cashRequest.employee.id ;
                break;
            case 'Retired':
                save = false;
                field.title = 'Cash Request Retired';
                field.text = 'Cash request for ' + cashRequest.requester + ' hass been retired';
                field.recipient = 'PD';
                break;
            default : save = false; break;
        }
        if (save) field.save();
    });
    return workflow;
};

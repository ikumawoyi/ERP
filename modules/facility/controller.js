//#region Facility and Asset Management
exports.getAllAssets = function (req, res) {
    var async = require('async');
    var data = {};
    async.parallel([
        function (cb) {
            req.app.db.models.Asset
                .find()
                .populate('type', 'name code shared')
                .populate('location', 'name')
                .exec(function (er, assets) {
                    cb(null, assets);
                });
        },
        function (cb) {
            req.app.db.models.AssetType.find()
                .populate('department', 'name designations')
                .exec(function (err, types) {
                    cb(null, types);
                });
        },
        function (cb) {
            req.app.db.models.Location.find()
                .exec(function (err, locs) {
                    cb(null, locs);
                });
        },
        function (cb) {
            req.app.db.models.Employee.find('firstName lastName department designation')
                .populate('department', 'name designations')
                .exec(function (err, locs) {
                    var emps = [];
                    locs.forEach(function (emp) {
                        emps.push({
                            name: emp.fullName(), dept: emp.department.name, desig: emp.designation, _id: emp.id,
                            concat: emp.fullName() + ' (' + emp.department.name + ' - ' + emp.designation + ')'
                        });
                    });
                    cb(null, emps);
                });
        }
    ], function (err, r) {
        if (err) res.status(500).send(err);
        else {
            r = r || [];
            data.assets = r[0]; data.assetTypes = r[1]; data.assetLocs = r[2]; data.emps = r[3];
            res.json(data);
        }
    })

};
exports.assetDetails = function (req, res) {
    req.app.db.models.Asset.findById(req.params.id)
        .populate('type', 'name code shared')
        .populate('location', 'name')
        .populate('tickets', '-type -location -asset')
        .populate('assigned', 'firstName lastName designation department employeeId')
        .exec(function (er, asset) {
            if (er) return res.status(500).send('Asset details could not be retrieved');
            if (!asset) res.status(500).send('Asset was not found');
            else {
                req.app.db.models.Organisation.populate(asset.assigned, { path: 'department', select: 'name' }, function (e) {
                    res.json(asset);
                });
            }
        });
}
exports.saveAsset = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var async = require('async');
    workflow.on('validate', function () {
        var asset = req.body || {};
        var msg = [];
        ['type', 'code', 'location', 'assigned']
            .forEach(function (i) {
                if (!asset[i]) msg.push(req.app.kenna.utility.capitalize(i));
            });

        if (msg.length > 0) {
            workflow.outcome.errors.push(msg.join(',') + ' field' + (msg.length > 1 ? 's are' : ' is') + ' required.');
            return workflow.emit('response');
        } else {
            asset.type = asset.type._id;
            asset.location = asset.location._id;
            async.parallel([
                function (cb) {
                    req.app.db.models.AssetType.findById(asset.type)
                        .populate('department', 'name designations')
                        .exec(function (err, type) {
                            if (type)
                                cb(null, type);
                            else cb(err ? 'Error occurred while retrieving selected type' : 'Selected asset Type was not found')
                        });
                },
                function (cb) {
                    req.app.db.models.Location.findById(asset.location)
                        .exec(function (err, loc) {
                            if (loc) cb(null, loc);
                            else cb(err ? 'Error occurred while retrieving selected location' : 'Selected asset was not found')
                        });
                },
                function (cb) {
                    if (typeof (asset.assigned || {})._id == 'string')
                        asset.assigned = [asset.assigned._id];
                   // else if (asset.assigned.length == 0)
                    //{
                    //    var t = [];
                    //    asset.assigned.forEach(function (item) { t.push(item._id); });
                    //    asset.assigned = t;
                    //} else
                      //  asset.assigned = [];
                    cb();
                }
            ], function (er, r) {
                if (er) {
                    workflow.outcome.message = er;
                    return workflow.emit('response');
                } else {
                    workflow.asset = asset;
                    workflow.assetType = r[0];
                    workflow.assetLoc = r[1];
                    if (!workflow.asset._id) workflow.emit('create'); else workflow.emit('update');
                }
            });
        }
    });
    workflow.on('updateRefs', function (isUpdate) {
        async.parallel([
            function (cb) {
                if (workflow.assetType.assets.indexOf(workflow.asset.id) == -1) {
                    workflow.assetType.assets.push(workflow.asset.id);
                    workflow.assetType.save(function (er, area) {
                        cb();
                    });
                } else cb();
            }, function (cb) {
                if (workflow.assetLoc.assets.indexOf(workflow.asset.id) == -1) {
                    workflow.assetLoc.assets.push(workflow.asset.id);
                    workflow.assetLoc.save(function (er, area) {
                        cb();
                    });
                } else cb();
            },
            function (cb) {
                req.app.db.models.AssetType.find({ assets: workflow.asset.id })
                    .exec(function (err, types) {
                        async.each(types, function (item, cbx) {
                            if (item.id != workflow.assetType.id) {
                                var i = item.assets.indexOf(workflow.asset.id);
                                if (i >= 0) item.assets.splice(i, 1);
                                item.save(function () { cbx(); });
                            }
                            else cbx();
                        }, function () {
                            cb();
                        })
                    });
            },
            function (cb) {
                req.app.db.models.Location.find({ assets: workflow.asset.id })
                    .exec(function (err, types) {
                        async.each(types, function (item, cbx) {
                            if (item.id != workflow.assetLoc.id) {
                                var i = item.assets.indexOf(workflow.asset.id);
                                if (i >= 0) item.assets.splice(i, 1);
                                item.save(function () { cbx(); });
                            }
                            else cbx();
                        }, function (er) {
                            cb();
                        })
                    });
            }
        ], function () {
            workflow.outcome.success = true;
            workflow.outcome.message = isUpdate ? 'Asset Updated' :'New Asset Created';
            workflow.emit('response');
        })
    });
    workflow.on('update', function () {
        workflow.isNew = true;
        req.app.db.models.Asset.findById(workflow.asset._id, function (err, exp) {
            if (err) { return workflow.emit('exception', err); }
            else if (!exp) { return workflow.emit('create'); }
            else {
                req.app.kenna.utility.populate(exp, workflow.asset);
                exp.save(function (err, asset) {
                    if (err) { return workflow.emit('exception', err); }
                    else {
                        workflow.asset = asset;
                        workflow.emit('updateRefs', true);
                    }
                });
            }
        });
    });
    workflow.on('create', function () {
        workflow.isNew = false;
        req.app.db.models.Asset.create(workflow.asset, function (err, asset) {
            if (err) { return workflow.emit('exception', err); }
            else {
                workflow.asset = asset;
                workflow.emit('updateRefs');
            }
        });
    });
    workflow.emit('validate');
};
exports.getAllAssetTypes = function (req, res) {
    req.app.db.models.AssetType.find({})
        .populate('department', 'name designations')
        .populate('assets')
        .exec(function (err, types) {
            res.json(types);
        });
};
exports.saveAssetType = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var assetType = req.body;
        if (!assetType.name) workflow.outcome.errors.push('The name field is required.');
        if (!assetType.code) workflow.outcome.errors.push('The code field is required.');
        if (!assetType.department) workflow.outcome.errors.push('The department field is required.');
        if (workflow.hasErrors()) return workflow.emit('response');
        else {
            assetType.designations = assetType.designations || [];
            workflow.assetType = assetType;
            workflow.assetType.department = workflow.assetType.department._id;
            workflow.emit('verifyDept');
        }
    });
    workflow.on('verifyDept', function () {
        req.app.db.models.Organisation.findById(workflow.assetType.department, function (err, dept) {
            if (err) { return workflow.emit('exception', err); }
            else if (dept) {
                var msg = '';
                workflow.assetType.designations.forEach(function (i) {
                    if (dept.designations.indexOf(i) == -1)
                        msg += 'Designation "' + i + '" was not found. ';
                });
                if(workflow.assetType.designations.length == 0) workflow.assetType.designations = dept.designations;
                if (msg) {
                    workflow.outcome.message = msg;
                    workflow.emit('response');
                } else if (!workflow.assetType._id) workflow.emit('create'); else workflow.emit('update');
            }
        });
    })
    workflow.on('update', function () {
        req.app.db.models.AssetType.findById(workflow.assetType._id, function (err, exp) {
            if (err) { return workflow.emit('exception', err); }
            else if (!exp) { return workflow.emit('create'); }
            else {//exp.maintenance = workflow.maintenance;
                req.app.kenna.utility.populate(exp, workflow.assetType);
                exp.save(function (err, type) {
                    if (err) { return workflow.emit('exception', err); }
                    else {
                        workflow.outcome.item = type;
                        workflow.outcome.success = true;
                        workflow.outcome.message = 'Asset Updated';
                        workflow.emit('response');
                    }
                });
            }
        });
    });
    workflow.on('create', function () {
        req.app.db.models.AssetType.create(workflow.assetType, function (err, type) {
            if (err) { return workflow.emit('exception', err); }
            else {
                workflow.outcome.item = type;
                workflow.outcome.success = true;
                workflow.outcome.message = 'New Asset Created';
                workflow.emit('response');
            }
        });
    });
    workflow.emit('validate');
};
exports.getAllAssetLocations = function (req, res) {
    req.app.db.models.Location.find({})
        .exec(function (err, locs) {
            res.json(locs);
        });
};
exports.saveAssetLocation = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var location = req.body;
        if (!location.name) workflow.outcome.errors.push('The name field is required.');
        workflow.location = location;
        if (workflow.hasErrors()) return workflow.emit('response');
        else if (!workflow.location._id) workflow.emit('create');
        else workflow.emit('update');
    });
    workflow.on('sendResponse', function (er) {
        workflow.outcome.success = true;
        workflow.outcome.message = workflow.isNew ? 'New Location Created' : 'Location Updated';
        workflow.emit('response');
    });
    workflow.on('update', function () {
        workflow.isNew = false;
        req.app.db.models.Location.findById(workflow.location._id, function (err, exp) {
            if (err) { return workflow.emit('exception', err); }
            else if (!exp) { return workflow.emit('create'); }
            else {
                exp.name = workflow.location.name;
                exp.save(function (err, location) {
                    if (err) { return workflow.emit('exception', err); }
                    else {
                        workflow.location = location;
                        workflow.emit('sendResponse');
                    }
                });
            }
        });
    });
    workflow.on('create', function () {
        workflow.isNew = true;
        req.app.db.models.Location.create({ name: workflow.location.name, assets: [] }, function (err, location) {
            if (err) { return workflow.emit('exception', err); }
            else { workflow.location = location; workflow.emit('sendResponse'); }
        });
    });
    workflow.emit('validate');
};
exports.getEmployeeAssets = function (req, res) {
    var async = require('async');
    var us = require('underscore');

    var data = { support: { assets: [], tickets: [] }, assign: { assets: [], tickets: [] } };
    async.parallel([
        function (cb) {// Get All assets which type is assigned to employee(Department/Designation)
            req.app.db.models.AssetType.find({ department: req.user.employee.department.id, designations: req.user.employee.designation })
                .populate('department', 'name designations')
                .populate('assets')
                .exec(function (err, types) {
                    req.app.db.models.AssetType.populate(types, { path: 'assets.type', select: 'name code shared' },
                        function () {
                            var t = [];
                            types.forEach(function (i) { t = t.concat(i.assets); });
                            cb(null, t);
                        })
                });
        },
        function (cb) { //Get All assets assigned to you(and others)
            req.app.db.models.Asset
            .find({ assigned: req.user.employee.id })
            .populate('type', 'name code shared')
            .populate('location', 'name')
            .exec(function (er, assets) { cb(null, assets); });
        }
    ],
    function (err, results) {
        var data = {
            support: {
                assets: results[0], tickets: []
            },
            assign: {
                assets: results[1], tickets: []
            }
        };
        async.parallel([
            function (cb) {
                var assets = us.pluck(data.support.assets, '_id');
                req.app.db.models.AssetTicket
                       .find({ asset: { $in: assets } })
                       .populate('type', 'name code shared')
                       .populate('location', 'name')
                        .populate('asset')
                       .exec(function (er, tickets) { cb(null, tickets); });
            },
            function (cb) {
                var assets = us.pluck(data.assign.assets, '_id');
                req.app.db.models.AssetTicket
                       .find({ asset: { $in: assets } })
                       .populate('type', 'name code shared')
                       .populate('location', 'name')
                        .populate('asset')
                       .exec(function (er, tickets) { cb(null, tickets); });
            }
        ], function (er, result) {
            if (er) res.json(data);
            else {
                data.assign.tickets = result[1];
                data.support.tickets = result[0];
                res.json(data);
            }
        })
    });
};
exports.openNewTicket = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var ticket = req.body || {};
        var msg = [];
        ['description', 'asset', 'priority']
            .forEach(function (i) {
                if (!ticket[i]) msg.push(req.app.kenna.utility.capitalize(i));
            });

        if (msg.length > 0) {
            workflow.outcome.errors.push('The ' + msg.join(',') + ' field' + (msg.length > 1 ? 's are' : ' is') + ' required.');
            return workflow.emit('response');
        } else {
            var tick = {
                asset: ticket.asset._id,
                //location: ticket.asset.location._id,
                //type: ticket.asset.type._id,
                //code: ticket.asset.code,
                priority: ticket.priority,
                description: ticket.description,
                date: new Date(new Date().toDateString()),
                status: 'Faulty'
            }
            workflow.ticket = tick;
            workflow.emit('verifyAsset');
        }
    });
    workflow.on('verifyAsset', function () {
        req.app.db.models.Asset.findById(workflow.ticket.asset)
            .populate('location')
            .populate('type')
            .exec(function (err, asset) {
                if (asset) {
                    if (asset.assigned.indexOf(req.user.employee.id) >= 0) workflow.emit('checkPending', asset);
                    else {
                        workflow.outcome.message = 'Can not submit a support ticket for assets not assigned to you.'
                        workflow.outcome.errors.push('Please ensure you selected the correct asset.');
                        workflow.emit('response');
                    }
                }
                else {
                    workflow.outcome.errors.push(err ?
                    'Error occurred while retrieving asset' :
                    'Asset was not found');
                    workflow.emit('response');
                }
            });
    })
    workflow.on('checkPending', function (asset) {
        req.app.db.models.AssetTicket.findOne({ asset: asset.id, isClosed: false })
            .exec(function (err, loc) {
                if (loc) {
                    if (loc.status != 'Close') {
                        workflow.outcome.message = 'A support ticket is still pending for the selected asset.'
                        workflow.outcome.errors.push('Please close the pending ticket to continue.');
                        workflow.emit('response');
                    }
                    else {
                        loc.isClosed = true;
                        loc.save(function () { return workflow.emit('checkPending', asset); });
                    }
                }
                else workflow.emit('submitTicket', asset);
            });
    });
    workflow.on('submitTicket', function (asset) {
        var tick = {
            code: asset.code,
            description: workflow.ticket.description,
            type: asset.type._id,
            asset: asset._id,
            location: asset.location._id,
            priority: workflow.ticket.priority,
            date: new Date(new Date().toDateString()),
            status: 'Faulty',
            isClosed: false
        }
        req.app.db.models.AssetTicket.create(tick, function (err, ticket) {
            if (err) return workflow.emit('exception', err);
            else workflow.emit('updateAsset', asset, ticket);
        });
    });
    workflow.on('updateAsset', function (asset, ticket) {
        asset.tickets.push(ticket.id);
        asset.state = ticket.status;
        asset.save(function () { workflow.emit('notifySupport', ticket, asset); });
    });
    workflow.on('notifySupport', function (ticket, asset) {
        var user = req.user;
        req.app.utility.notify.emit('assetSupportRequest', ticket, asset, user);
        workflow.outcome.success = true;
        workflow.outcome.message = workflow.isNew ? 'New Location Created' : 'Asset complaint successfully submitted';
        workflow.emit('response');
    });
    workflow.emit('validate');
};
exports.replyOpenTicket = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var ticket = req.body || {};
    workflow.on('validate', function () {
        if(ticket.reply){
            req.app.db.models.AssetTicket.findById(ticket._id, function(err, tick){
                if(tick){
                    tick.fixedDate = new Date(new Date().toDateString());
                    tick.status = 'Closed';
                    tick.isClosed = true;
                    tick.reply = ticket.reply;
                    tick.replyDate = new Date();
                    tick.replyBy = req.user.employee.fullName();
                    //tick.subDetails = tick.subDetails || [];
                    //tick.subDetails = [{
                    //    type: 'Reply',
                    //    by: '',//req.user.employee.fullName(),
                    //    date : new Date(),
                    //    text : ticket.reply
                    //}];
                    workflow.ticket = tick;
                    workflow.emit('verifyAssetType');
                }
                else{
                    workflow.outcome.errors.push(err ?
                        'Error occurred while retrieving ticket' :
                        'Submitted ticket was not found');
                    workflow.emit('response');
                }
            });
        } else{
            workflow.outcome.errors.push('Please submit a reply to close the ticket.');
            workflow.emit('response');
        }
    });
    workflow.on('verifyAssetType', function () {
        req.app.db.models.AssetType.findById(workflow.ticket.type)
            .exec(function (err, assetType) {
                if (assetType) {
                    if (assetType.department == req.user.employee.department.id && (assetType.designations == 0 || assetType.designations.indexOf(req.user.employee.designation) >= 0))
                    {
                        workflow.ticket.save(function(e){
                            if(!e){
                                workflow.emit('updateAsset', workflow.ticket);
                            }else {
                                workflow.outcome.message = 'Could not modify ticket status.';
                                workflow.outcome.errors.push('Please ensure you selected the correct asset.');
                                workflow.outcome.errdata = e;
                                workflow.emit('response');
                            }
                        })
                    } else {
                        workflow.outcome.message = 'Can not close a support ticket for assets not maintain by to you.';
                        workflow.outcome.errors.push('Please ensure you selected the correct asset.');
                        workflow.emit('response');
                    }
                }
                else {
                    workflow.outcome.errors.push(err ?
                        'Error occurred while retrieving asset type' :
                        'Asset type was not found');
                    workflow.emit('response');
                }
            });
    });
    workflow.on('updateAsset', function (ticket) {
        req.app.db.models.Asset.findById(ticket.asset, function(e, asset){
            if(e){
                workflow.outcome.message = 'Could not modify asset status.';
                workflow.outcome.errdata = e;
                workflow.emit('response');
            }else{
                asset.state = 'Good';
                asset.lastRepaired = new Date(new Date().toDateString());
                asset.save(function () { workflow.emit('notifyAssigned', ticket, asset); });
            }
        });
    });
    workflow.on('notifyAssigned', function (ticket, asset) {
        var user = req.user;
        req.app.utility.notify.emit('assetSupportReply', ticket, asset, user);
        workflow.outcome.success = true;
        workflow.outcome.message = 'Asset ticket reply successfully submitted.\nThe ticket is now closed';
        workflow.emit('response');
    });
    workflow.emit('validate');
};
exports.modifyTicketStatus = function (req, res) {

};

exports.getDashbordData = function(req,res){
    var async = require('async');
    var data = {};
    async.parallel([
        function (cb) {
            req.app.db.models.Asset
                .find()
                .populate('type', 'name code shared')
                .populate('location', 'name')
                .populate('tickets assigned')
                .exec(function (er, assets) {
                    data.assets = assets || [];
                    cb(er);
                });
        },
        function (cb) {
            req.app.db.models.AssetTicket.find({ isClosed: false })
                .populate('type', 'name code shared')
                .populate('location', 'name')
                .populate('asset')
                .exec(function (err, ticks) {
                    data.tickets = ticks;
                    cb(err, ticks);
                });
        }
    ], function (err, r) {
        if (err) res.status(500).send(err);
        else {
            res.json(data);
        }
    })
}
//#endregion
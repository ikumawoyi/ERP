const teamSize = 3;
var getDataForTeamLeaderAbuja = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var async = require('async'); var data = {}; var allocator = {};
    async.parallel([
        function (cb) {
            req.app.db.models.Allocator
                .findOne({ employee: req.user.employee.id }, function (e, al) {
                    if (e) cb('Could not retrieve case allocation history');
                    else if (al) {
                        allocator = al; cb();
                    }
                    else workflow.emit('createAllocator', function (e) { cb(e); });
                });
        }, function (cbx) {//Get open case //Modify
            req.app.db.models.Case.findOne({ members: req.user.employee.id, full: false, location: req.user.employee.location })
                .exec(function (e, t) {
                    data.open = t || { members: [], location: 'Lagos' };
                    cbx();
                });
        }], function (e) {
            async.parallel([
                function (cb) {
                    req.app.db.models.Employee
                        .find({
                            $and: [{ department: req.app.counsel.id },{status: {$ne: 'Inactive'}}, { _id: { $nin: allocator.allocated } }, { _id: { $nin: data.open.members } }, { location: req.user.employee.location }, { designation: { $in: req.app.juniorCounsels } }]
                        }, 'firstName lastName designation department location')
                        .exec(function (e, t) {
                            data.unallocated = (t || []).map(function (t) {
                                return { name: t.fullName(), location: t.location || 'Lagos', designation: t.designation, status: 'Unallocated', id: t.id }
                            });
                            var c = data.unallocated.length;
                            var us = require('underscore');
                            data.unallocated = us.groupBy(data.unallocated, function (p) {
                                return (req.app.seniorCounsels.indexOf(p.designation) == -1) ? p.designation : 'Senior Counsel'
                            });
                            data.c = c - (data.unallocated['Senior Counsel'] || []).length;
                            delete data.unallocated['Senior Counsel'];
                            cb();
                        });
                },
                function (cb) {
                    req.app.db.models.Employee.find({ department: req.app.counsel.id,status: {$ne: 'Inactive'}, $or: [{ _id: { $in: allocator.allocated } }, { location: req.user.employee.location }, { _id: { $in: data.open.members } }] }, 'firstName lastName designation department location')
                        .exec(function (e, t) {
                            data.allocated = (t || []).map(function (t) {
                                return { name: t.fullName(), designation: t.designation, status: 'Allocated', id: t.id };
                            }); cb();
                        });
                }
            ], function (e, m) {
                data.sup = req.app.seniorCounsels;
                data.sub = req.app.juniorCounsels;
                res.json(data);
            });

            if (e) res.json({ success: false, message: e });
            else if (data.open.members.length > 0 && allocator.allocated.length > 0) workflow.emit('modifyAllocator');
            else if (true);
            else workflow.emit('getData', allocator);
        });
    workflow.on('createAllocator', function (cb) {
        var alc = new req.app.db.models.Allocator({
            employee: req.user.employee.id,
            allocated: [],
            added: new Date(new Date().toDateString()),
            status: 'Open',
            cycles: 0,
            batch: 1
        });
        alc.save(function (e, p) {
            allocator = alc; cb(e);
        })
    });
    workflow.on('modifyAllocator', function () {
        allocator.allocated = data.open.members; allocator.status = 'Recycled';
        ++allocator.batch; ++allocator.cycles;
        allocator.save(function (e, p) {
            if (!e) workflow.emit('getData', allocator);
            else res.json({ success: false, message: 'An error occurred while recycling allocator.' })
        })
    });
    workflow.on('getData', function (al) {

    });
};
var getDataForTeamLeaderLagos = function (req, res) {
    var workflow = req.app.utility.workflow(req, res); var count = 0;
    var async = require('async'); var data = {}; var allocator = {};
    async.parallel([
        function (cb) {
            req.app.db.models.Allocator
                .findOne({ employee: req.user.employee.id }, function (e, al) {
                    if (e) cb('Could not retrieve case allocation history');
                    else if (al) {
                        allocator = al; cb();
                    }
                    else workflow.emit('createAllocator', function (e) { cb(e); });
                });
        }, function (cbx) {//Get open case //Modify
            req.app.db.models.Case.findOne({ initiator: req.user.employee.id, full: false, location: req.user.employee.location })
                .exec(function (e, t) {
                    data.open = t || { members: [], location: 'Lagos' };
                    cbx();
                });

        }], function (e) {
            if (e) res.json({ success: false, message: e });
            else if (data.open.members.length > 0 && allocator.allocated.length > 0) workflow.emit('modifyAllocator');
            else workflow.emit('getData', allocator);
        });
    workflow.on('createAllocator', function (cb) {
        var alc = new req.app.db.models.Allocator({
            employee: req.user.employee.id,
            allocated: [],
            added: new Date(new Date().toDateString()),
            status: 'Open',
            cycles: 0,
            batch: 1
        });
        alc.save(function (e, p) {
            allocator = alc; cb(e);
        })
    });
    workflow.on('modifyAllocator', function (cb) {
        allocator.allocated = data.open.members; allocator.status = 'Recycled';
        ++allocator.batch; ++allocator.cycles;
        allocator.save(function (e, p) {
            if (!e) workflow.emit('getData', allocator);
            else res.json({ success: false, message: 'An error occurred while recycling allocator.' })
        })
    });
    workflow.on('getData', function (al) {
        async.parallel([
            function (cb) {
                req.app.db.models.Employee
                    .find({
                        $and: [{ department: req.app.counsel.id },{status: {$ne: 'Inactive'}}, { $or: [{ $and: [{ _id: { $nin: al.allocated } }, { _id: { $nin: data.open.members } }, { location: req.user.employee.location }, { designation: { $in: req.app.juniorCounsels } }] }, { designation: { $in: req.app.seniorCounsels } }] }]
                    }, 'firstName lastName designation department location')
                    .exec(function (e, t) {
                        data.unallocated = (t || []).map(function (t) {
                            return { name: t.fullName(), location: t.location || 'Lagos', designation: t.designation, status: 'Unallocated', id: t.id }
                        });
                        var c = data.unallocated.length;
                        var us = require('underscore');
                        data.unallocated = us.groupBy(data.unallocated, function (p) {
                            return (req.app.seniorCounsels.indexOf(p.designation) == -1) ? p.designation : 'Senior Counsel'
                        });
                        data.c = c - (data.unallocated['Senior Counsel'] || []).length;
                        if (data.c == 0 && count == 0) workflow.emit('modifyAllocator'); else cb();
                    });
            },
            function (cb) {
                //req.app.db.models.Employee.find({ department: req.app.counsel.id, $or: [{ _id: { $in: al.allocated } }, { location: req.user.employee.location }, { _id: { $in: data.open.members } }] }, 'firstName lastName designation department location')
                //    .exec(function (e, t) {
                //        data.allocated = (t || []).map(function (t) {
                //            return { name: t.fullName(), designation: t.designation, status: 'Allocated', id: t.id };
                //        }); cb();
                //    });
                cb();
            }
        ], function (e, m) {
            data.sup = req.app.seniorCounsels;
            data.sub = req.app.juniorCounsels;
            res.json(data);
        });
    });
};
exports.getDataForTeamLeader = function (req, res) {
    if (req.user.employee.location == 'Abuja') getDataForTeamLeaderAbuja(req, res);
    else getDataForTeamLeaderLagos(req, res);
};
exports.getCasesForCounsel = function (req, res) {
    var async = require('async');
    req.app.db.models.Case.find({closed :{$ne: true}, $or: [{ initiator: req.user.employee.id }, { members: req.user.employee.id }] }, '-full -stat -batch')
        .populate('initiator leader members', 'firstName lastName designation location').exec(function (e, t) {
            res.json(t || []);
        });
};
exports.saveCase = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var casE = req.body; var p = [];
    var async = require('async');
    async.parallel([
        function (cb) {
            ['title', 'members', 'location'].forEach(function (i) {
                if (!casE[i]) p.push(req.app.kenna.utility.capitalize(i));
            });
            if (p.length > 0) cb('The following field' + (p.length == 1 ? ' is' : 's are') + ' required "' + p) + '".';
            else if (Array.isArray(casE.members) && casE.members.length > 0 && casE.members.length < 4) {
                cb();
            } else cb('Selected members must be between one and three.');
        },
        function (cb) {
            req.app.db.models.Allocator
                .findOne({ employee: req.user.employee.id }, function (e, al) {
                    if (e) cb('Could not retrieve case allocation history');
                    else if (al) {
                        workflow.allocator = al;
                        cb();
                    } else cb('Could not find case allocation history. please refresh the page and try again');
                });
        }
    ], function (e) {
        if (e) {
            workflow.outcome.errors.push(e);
            workflow.emit('response');
        } else {
            var selectedMembers = casE.members.map(function (p) { return p._id || p; });
            workflow.emit('verifymembers', workflow.allocator, selectedMembers);
        }
    });
    workflow.on('verifymembers', function (al, members) {
        if (req.user.employee.location == 'Abuja') {
            req.app.db.models.Case.findById(casE._id)
                .exec(function (e, t) {
                    if (e) return res.json({ success: false, message: 'Could not retrieve the selected case data' });
                    if (t) {
                        if (t.members.length == teamSize) {
                            if (t.full) res.json({ success: false, message: 'Team Members already completed.' });
                            else {
                                t.full = true; t.save(function () { res.json({ success: false, message: 'Team Members already completed.', full: true }); });
                            }
                        } else {
                            var newlyAdded = (members || [])
                                .filter(function (p) {
                                    return t.members.indexOf(p) == -1;
                                });
                            if (newlyAdded.length > 1) res.json({ success: false, message: 'You can only add just one associate.' });
                            else if (newlyAdded.length == 1) {
                                t.members = members;
                                workflow.tempV = newlyAdded[0];
                                t.full = members.length == teamSize; t.stat = casE.stat;;
                                t.save(function (e) {
                                    if (e) {
                                        console.log('Could not update case record', e);
                                        workflow.outcome.errors.push('An error occurred while updating the case record.');
                                        workflow.emit('response');
                                    } else {
                                        workflow.case = t; workflow.isUpdate = true;
                                        workflow.emit('updateAllocator', t.members);
                                    }
                                });
                            } else res.json({ success: false, message: newlyAdded.length == 0 ? 'An error occurred.' : 'Only associate in Abuja can be added.' });
                        }
                    }
                    else res.json({ success: false, message: 'The submitted case was not found.' });
                });
        }
        else
            req.app.db.models.Employee.find({ $and: [{ _id: { $in: members } }, { department: req.app.counsel.id }, {status: {$ne: 'Inactive'}}, { $or: [{ $and: [{ _id: { $nin: al.allocated } }] }, { designation: { $in: req.app.seniorCounsels } }] }, ] }, 'firstName lastName designation department  location')
                .exec(function (e, t) {

                    //console.log(members, t || []);
                    //if (members.length == (t || []).length)
                        return casE._id ? workflow.emit('updateCase', members) : workflow.emit('createCase', members);
                    //else workflow.emit('prepareErrorMessage', members, t, al);
                });
    });
    workflow.on('prepareErrorMessage', function (members, t, al) {
        res.json({ 0: members, 1: t, 2: al, success: false, message: 'Could not complete the request due to an error.' });
    });
    workflow.on('createCase', function (m) {
        var newCase = new req.app.db.models.Case({
            title: casE.title,
            description: casE.description,
            initiator: req.user.employee.id,
            leader: req.user.employee.id,
            date: new Date(),
            members: m,
            stat: casE.stat,
            location: casE.location,
            batch: workflow.allocator.batch,
            full: m.length == teamSize
        });
        newCase.save(function (e) {
            if (e) {
                console.log('275 - An error occurred while saving', e);
                workflow.outcome.errors.push('An error occurred while saving the case record.');
                workflow.emit('response');
            } else {
                workflow.newCase = newCase;
                workflow.emit('updateAllocator', newCase.members);
            }
        });
    });
    workflow.on("updateCase", function (members) {
        req.app.db.models.Case.findById(casE._id)
            .exec(function (e, t) {
                if (e) res.json({ success: false, message: 'Could not retrieve the selected case data' })
                if (t) {
                    if (t.members.length == teamSize) {
                        if (t.full) res.json({ success: false, message: 'Team Members already completed.' });
                        else {
                            t.full = true; t.save(function () { res.json({ success: false, message: 'Team Members already completed.' }); });
                        }
                    } else {
                        var pp = []; var px = []; workflow.tempV = [];
                        t.members.forEach(function (p) {
                            if (members.indexOf(p.toString()) == -1) pp.push(p.toString());
                            workflow.tempV.push(p.toString());
                        });
                        if (pp.length > 0) res.json({ success: false, message: (pp.length > 1 ? "Some " : " A ") + "previously selected counsel" + (pp.length > 1 ? "s weren't " : " wasn't ") + 'included in the submitted data.' });
                        else {
                            t.members = members;
                            t.full = members.length == teamSize; t.stat = casE.stat;
                            t.save(function (e) {
                                if (e) {
                                    console.log('306 - An error occurred while updating', e);
                                    workflow.outcome.errors.push('An error occurred while updating the case record.');
                                    workflow.emit('response');
                                } else {
                                    workflow.case = t; workflow.isUpdate = true;
                                    workflow.emit('updateAllocator', t.members);
                                }
                            })
                        }
                    }
                }
                else res.json({ success: false, message: 'The submitted case was not found.' });
            });
    });
    workflow.on('updateAllocator', function (m) {
        if (workflow.isUpdate) {
            if (workflow.case.location == 'Abuja') workflow.allocator.allocated.push(workflow.tempV); else
                m.forEach(function (p) {
                    if (workflow.tempV.indexOf(p.toString()) == -1) workflow.allocator.allocated.push(p.toString());
                });
        }
        else workflow.allocator.allocated = workflow.allocator.allocated.concat(m);
        workflow.allocator.save(function (e) {
            if (e) {
                if (workflow.isUpdate) {
                    workflow.case.members = workflow.tempV; workflow.case.full = workflow.case.members.length == teamSize;
                    workflow.case.save(function () {
                        console.log('333 - An error occurred while updating team allocation record for an updated case', e);
                        workflow.outcome.errors.push('An error occurred while updating team allocation record for an updated case.');
                        workflow.emit('response');
                    });
                }
                else
                    workflow.newCase.remove(function () {
                        console.log('340 - An error occurred while updating team allocation record', e);
                        workflow.outcome.errors.push('An error occurred while updating team allocation record.');
                        workflow.emit('response');
                    });
            }
            else {
                workflow.outcome.success = true;
                workflow.outcome.message = workflow.isUpdate ? 'Successfully updated the case' : 'Successfully created the case';
                workflow.emit('response');
            }
        });
    });
};
exports.closeCase = function(req, res){
    var workflow = req.app.utility.workflow(req, res);
    var date = req.body.date, id = req.params.id;
    var async = require('async');
    async.parallel([
        function (cb) {
            req.app.db.models.Case.findById(id)
                .exec(function (e, t) {
                    if (e) return cb('Could not retrieve the selected case data');
                    else if(!t) cb('The selected case was not found.');
                    //else if(t.leader != req.user.employee.id) cb('You can only close a case in which you are the team leader.');
                    else if (t && t.members.length != teamSize) cb('The selected case is incomplete. Only completed cases can be closed.')
                    else {t.closeDate = date;t.closed = true; workflow.case = t; cb();}
                });
        }
    ], function (e) {
        if (e) {
            workflow.outcome.errors.push(e);
            workflow.emit('response');
        } else {
            workflow.case.save(function(){
                workflow.outcome.success = true;
                workflow.outcome.message ='Successfully marked the case as closed';
                workflow.emit('response');
            });
        }
    });
};
exports.activeCaseReports = function (req, res) {
    var query = {closed :{"$ne": true}}, allowed = 'closed date initiator leader location members title';
    if(req.params.id == 'closed')
        query.closed = true; //return closedCaseReports(req, res);
    req.app.db.models.Case.find(query,allowed)
        .populate('initiator leader members', 'firstName lastName designation')
        .exec(function (e, cs) {
            var us = require('underscore');
            var temp = (cs || []).map(function (p) {
                return p.initiator;
            });
            var initiators = []; var ids = [];
            temp.forEach(function (p) {
                if ((p || {}).id && ids.indexOf(p.id.toString()) == -1) {
                    ids.push(p.id.toString());
                    initiators.push(p.toObject());
                }
            });
            initiators.forEach(function (i) {
                if(!i) return;
                i.cases = (cs || []).filter(function (j) {return j.initiator.id.toString() == i._id; });
                i.name = i.firstName + ' ' + i.lastName;
            });

            req.app.db.models.Employee.find({designation: { $in: req.app.seniorCounsels}, location: 'Abuja', status: {$ne: 'Inactive'}}, 'firstName lastName designation', function(e, f) {
                var async = require('async');
                async.each((f || []), function(s, cb){
                    req.app.db.models.Case.find({closed: query.closed, members: s.id},allowed)
                        .populate('initiator leader members', 'firstName lastName designation')
                        .exec(function (e, cs) {
                            if (s.id && ids.indexOf(s.id.toString()) == -1 && cs.length > 0) {
                                ids.push(s.id.toString());
                                var p = s.toObject();
                                p.cases = cs;
                                p.name = p.firstName + ' ' + p.lastName;
                                initiators.push(p);
                            }
                            cb();
                        });
                }, function(){
                    res.json(initiators);
                });
            });
        });
};
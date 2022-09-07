var sample = [{label: 'First Name', prop: 'firstName'},
    {label: 'Last Name', prop: 'lastName'},
    {label: 'Designation', prop: 'designation'},
    {label: 'Department', prop: 'department.name'}
];

exports.downloadKraDefinations = function(req,res){
    req.app.db.models.KRA.find()
        .populate('department')
        .populate('area')
        .exec(function(e,r){
            var opts = [{label: 'Area', prop: 'area.name'},
                {label: 'Description', prop: 'description'},
                {label: 'Department', prop: 'department.name'},
                {label: 'Weight', prop: 'weight'},
                {label: 'Designations', prop: 'designations'}
            ];
           req.app.utility.download(res).send(opts, r, 'kras' );
        });
};
exports.downloadKraData2 = function(req,res){
    //var period =
    var download = req.app.utility.download(res);
    req.app.db.models.EmployeeAppraisal.find({'kra.text': {$ne: null}},'employee period kra')
        .populate('employee', 'firstName lastName designation department employeeId')
        .populate('period', 'name year')
        .exec(function(e,r){
            req.app.db.models.Organisation.populate(r, {path: 'department', select: 'name'}, function(){
                var head = [{label: 'Name', prop: 'employee.fullName', isFunction: true},
                    {label: 'Designation', prop: 'employee.designation'},
                    {label: 'Department', prop: 'employee.department.name'},
                    {label: 'Period', prop: 'period.getName', isFunction: true},
                    {label: 'Score', prop: 'kra.score'},
                    {label: 'Rating', prop: 'kra.text'},
                    {label: 'Date', prop: 'kra.date'},
                    {label: 'By', prop: 'kra.by'}
                ];
                var head2 = [{label: 'Area', prop: 'details.area'},
                    {label: 'KRA', prop: 'details.kra'},
                    {label: 'Score', prop: 'scoring.score'},
                    {label: 'Rating', prop: 'scoring.text'},
                    {label: 'Weight', prop: 'details.weight'},
                    {label: 'Designations', prop: 'designations'}
                ];
                var data = [];
                r.forEach(function(i){
                   data.push(download.toRowArray(i, head));
                    ((i.kra || {}).list || []).forEach(function(p){
                        data.push(p);
                    });
                    //data.push(i.kra.list);
                });
                download.send(head2, data,'Appraisals' );
            });

        });
};
exports.downloadKraData = function (req, res) {
    //var period =
    var download = req.app.utility.download(res);
    req.app.db.models.EmployeeAppraisal.find({ 'kra.text': { $ne: null } }, 'employee period kra')
        .populate('employee', 'firstName lastName designation department employeeId')
        .populate('period', 'name year')
        .exec(function (e, r) {
            req.app.db.models.Organisation.populate(r, { path: 'employee.department', select: 'name' }, function () {
                var head = [{ label: 'Name', prop: 'employee.fullName', isFunction: true },
                    { label: 'Designation', prop: 'employee.designation' },
                    { label: 'Department', prop: 'employee.department.name' },
                    { label: 'Period', prop: 'period.getName', isFunction: true },
                    { label: 'Score', prop: 'kra.score' },
                    { label: 'Rating', prop: 'kra.text' },
                    { label: 'Date', prop: 'kra.date' }
                ];
                var head2 = [{ label: 'Area', prop: 'details.area' },
                    { label: 'KRA', prop: 'details.kra' },
                    { label: 'Score', prop: 'scoring.score' },
                    { label: 'Rating', prop: 'scoring.text' },
                    { label: 'Weight', prop: 'details.weight' },
                    { label: 'Designations', prop: 'designations' }
                ];
                var data = [];
                r.forEach(function (i) {
                    data.push(download.toArray(i, head));
                    //((i.kra || {}).list || []).forEach(function (p) {
                    //    data.push(p);
                    //});
                    //data.push(i.kra.list);
                });
                download.send(head, data, 'Appraisals');
            });

        });
};
exports.downloadEmployeeData = function(req,res){

};
exports.downloadAssestList = function(req,res){

};
exports.downloadAttendanceRecords = function(){

};
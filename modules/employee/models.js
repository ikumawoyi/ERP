module.exports = function (app, mongoose) {
    //employee
    var employeeSchema = new mongoose.Schema({
        employeeId: { type: String, required: true, unique: true,lowercase: true },
        firstName: { type: String, required: true },
        middleName: { type: String, default: '' },
        lastName: { type: String, required: true },
        dob: Date,
        gender: { type: String, default: '' },
        location: {type:String, default:''},
        maritalStatus: { type: String, default: '' },
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        zipCode: { type: String, default: '' },
        pEmail: { type: String, default: '', lowercase: true },
        pPhone: { type: String, default: '' },
        wEmail: { type: String, default: '', lowercase: true },
        wPhone: { type: String, default: '' },
        hired: { type: Date, required: true, default: Date.now },
        confirmed: Date,
        designation: { type: String/*, enum:app.constants.designations*/ },
        department: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation' },
        access: { type: String, enum: app.constants.accessLevels },
        nokName: { type: String, default: '' },
        nokRelationship: { type: String, default: '' },
        nokPhone: { type: String, default: '' },
        nokEmail: { type: String, default: '', lowercase: true },
        nokAddress: { type: String, default: '' },
        experiences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Experience' }],
        educations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Education' }],
        skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
        dependants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Dependant' }],
        leaveLevel: { type: String, default: 'Level 1', enum: app.constants.levels },
        leaveStatus: {
            casual: {
                entitlement: Number, taken: { type: Number, default: 0 }
            },
            annual: { entitlement: Number, taken: { type: Number, default: 0 } },
            parenting: { entitlement: { type: Number, default: 0 }, taken: { type: Number, default: 0 } },
            sick: { entitlement: { type: Number, default: 0 }, taken: { type: Number, default: 0 }, occassions: { type: Number, default: 0 } }
        },
        supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        subordinates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
        tasks: [String],
        status: {type: String,default: 'Active', required:true, enum:['Active', 'Inactive']}
    });
    employeeSchema.methods.fullName = function () {
        return this.firstName + ' ' + this.lastName;
    };
    employeeSchema.methods.isValidAccess = function () {
        return app.constants.access.indexOf(this.access) != -1;
    };
    employeeSchema.methods.canPlayRoleOf = function (name) {
        switch (name.toLowerCase()) {
            case 'admin': return this.access == 'M' || this.access == 'O';
            case 'finance': return this.department && this.department.name == 'Finance';
            default: return false;
        }
    };
    employeeSchema.methods.isPD = function () {
        //var l = 'O';
        //var result = this.access == l;
        //return result;
        return this.access == 'O' && this.department.name == 'HR' ;
    };
    employeeSchema.methods.isASupervisor = function () {
        return this.subordinates.length > 0;
    };
    app.db.model('Employee', employeeSchema);
    //experience
    var experienceSchema = new mongoose.Schema({
        employer: { type: String, required: true },
        designation: String,
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
    });
    app.db.model('Experience', experienceSchema);
    //education
    var educationSchema = new mongoose.Schema({
        school: { type: String, required: true },
        major: { type: String, required: true },
        qualification: { type: String, enum: app.constants.qualifications },
        grade: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        dateAwarded: Date,
        graduated: Boolean,
        employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
    });
    app.db.model('Education', educationSchema);
    //skill
    var skillSchema = new mongoose.Schema({
        name: { type: String, required: true },
        type: { type: String, default: '' },
        date: { type: Date, required: true },
        level: { type: String, required: true, enum: app.constants.skills },
        employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
    });
    app.db.model('Skill', skillSchema);
    //dependant
    var dependantSchema = new mongoose.Schema({
        firstName: { type: String, required: true },
        middleName: { type: String, default: '' },
        lastName: { type: String, required: true },
        dob: Date,
        gender: { type: String, default: '' },
        relationship: { type: String, default: '' },
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        zipCode: { type: String, default: '' },

        policyNumber: { type: String, default: '' },
        effectiveDate: Date,
        endDate: Date,

        employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
    });
    app.db.model('Dependant', dependantSchema);



};
module.exports = function (app, mongoose) {

var appraisalPeriodSchema = new mongoose.Schema({
        name: { type: String, required: true, enum: app.constants.quarters },
        year: { type: String, required: true },
        start: { type: Date, required: true },
        end: { type: Date, required: true },
        isExtended: { type: Boolean, defualt: false }
        //scoring:{ excellent:5, "very good":4, "good":3, "satisfactory":2, "poor":1}
    });
    appraisalPeriodSchema.methods.getName = function(){return (this.name || '') + ' ' + (this.year || '');};
    app.db.model('AppraisalPeriod', appraisalPeriodSchema);

    var employeeAppraisalSchema = new mongoose.Schema({
        employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
        period: { type: mongoose.Schema.Types.ObjectId, ref: 'AppraisalPeriod', required: true },
        kra: { list: [], score: Number, text: String, date: Date, by: String },
        assessment: { list: [], date: Date },
        competence: { list: [], score: Number, text: String, more: {},date:Date, by: String },
        evaluation: { list: [], score: Number, text: String }
    });

    employeeAppraisalSchema.index({ period: 1, employee: 1 }, { unique: true });
    employeeAppraisalSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('EmployeeAppraisal', employeeAppraisalSchema);
};
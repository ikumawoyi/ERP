module.exports = function (app, mongoose) {

    var selfAssessmentQSchema = new mongoose.Schema({
        question: { type: String, required: true },
        isCareer: { type: Boolean, default: false }
    });
    app.db.model('SelfAssessmentQ', selfAssessmentQSchema);


    //var selfAssessmentSchema = new mongoose.Schema({
    //    employeeId: {type:String, required:true},
    //    name: {type:String, required:true},
    //    department:{type:String, required:true},
    //    question: {type:mongoose.Schema.Types.ObjectId, ref:'SelfAssessmentQ', required:true},
    //    answer:{type:String, required:true},
    //    period: {type:mongoose.Schema.Types.ObjectId, ref:'AppraisalPeriod', required:true},
    //    dateCompleted:{type:Date, required:true}
    //});
    //selfAssessmentSchema.index({period:1, employeeId:1, question:1},{unique:true});

    var selfAssessmentSchema = new mongoose.Schema({
        employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
        question: {
            id: { type: String, required: true },
            text: { type: String, required: true },
            isCareer: { type: Boolean, default: false }
        },
        answer: { type: String },
        period: { type: mongoose.Schema.Types.ObjectId, ref: 'AppraisalPeriod', required: true },
        date: { type: Date, required: true }
    });
    selfAssessmentSchema.index({ period: 1, employee: 1, 'question.id': 1 }, { unique: true });
    selfAssessmentSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('SelfAssessment', selfAssessmentSchema);
};
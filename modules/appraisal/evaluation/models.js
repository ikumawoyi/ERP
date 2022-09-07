module.exports = function (app, mongoose) {
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var supervisorEvaluationAreaSchema = new mongoose.Schema({
        title: { type: String, required: true, unique: true },
        description: { type: String, default: '' }
    });
    app.db.model('SupervisorEvaluationArea', supervisorEvaluationAreaSchema);

    var supervisorEvaluationSchema = new mongoose.Schema({
        name: { type: String, required: true },
        supervisor: { type: ObjectId, ref: 'Employee', required: true },
        subordinate: { type: ObjectId, ref: 'Employee', required: true },
        details: {},
        scoring: {},
        score: Number,
        scoreText: String,
        period: { type: ObjectId, ref: 'AppraisalPeriod', required: true },
        date: { type: Date, required: true }
    });
    supervisorEvaluationSchema.index({ period: 1, supervisor: 1, subordinate: 1 }, { unique: true });
    supervisorEvaluationSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('SupervisorEvaluation', supervisorEvaluationSchema);

    var supEvaluationSummarySchema = new mongoose.Schema({
        name: { type: String, required: true },
        employeeId: { type: String, required: true },
        department: { type: String, required: true },
        designation: { type: String, required: true, enum: app.constants.designations },
        average: { type: Number, required: true },
        period: { type: ObjectId, ref: 'AppraisalPeriod', required: true },
        evaluations: [{ type: ObjectId, ref: 'SupervisorEvaluation' }]
    });
    app.db.model('SupervisorEvaluationSummary', supEvaluationSummarySchema);

};
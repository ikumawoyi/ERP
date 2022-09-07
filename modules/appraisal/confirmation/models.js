module.exports = function (app, mongoose) {
    var confirmationAreaSchema = new mongoose.Schema({
        area: { type: String, required: true, index: { unique: true } },
        header: { type: String, required: true },
        departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organisation' }]
    });
    app.db.model('ConfirmationArea', confirmationAreaSchema);

    var confirmationEvaluationSchema = new mongoose.Schema({
        employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true }, //Employee to appraise
        appraiser: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true }, //Employee doing the apprasing
        details: {},
        /*{
         *  area: {
         *      header: ....,
         *      score: ......,
         *      scoreText: ......
         *  }
         * }
         */
        score: Number,
        scoreText: String,
        recommendation: { type: String, enum: ['Confirm', 'Deny'] },
        reason: { type: String },
        date: { type: Date, required: true }
    });
    app.db.model('ConfirmationAppraisal', confirmationEvaluationSchema);

    var confirmationSummarySchema = new mongoose.Schema({
        employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
        appraisals: [confirmationEvaluationSchema],
        score: Number, text: String,
        date: { type: Date, required: true }
    });
    app.db.model('ConfirmationSummary', confirmationSummarySchema);

};
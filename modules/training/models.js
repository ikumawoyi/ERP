module.exports = function (app, mongoose) {
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var trainingSchema = new mongoose.Schema({
        date: { type: Date },
        start: { type: String },
        end: { type: String },
        title: { type: String },
        description: { type: String },
        invited: [{ type: ObjectId, ref: 'Employee' }],
        attendees: [{ type: ObjectId, ref: 'Employee' }],
        scores: {}
        /*{
         *  employeeId: {
         *      score: ......,
         *      text: ......
         *  }
         * }
         * OR
         * {
         *      employeeId: score
         * }
         */
    });
    app.db.model('Training', trainingSchema);
};
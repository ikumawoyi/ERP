module.exports = function (app, mongoose) {
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var disciplinaryActionSchema = new mongoose.Schema({
        issued: { type: Date, required: true },
        issuedBy: { type: ObjectId, ref: 'Employee' },
        employee: { type: ObjectId, ref: 'Employee', required: true },
        subject: { type: String, required: true },
        description: { type: String, required: true },
        status: { type: String, required: true, enum: ['Initiated', 'Responded', 'Requery'] },
        reply: { type: Date, required: true },
        requeryCount: {type: Number, default: 0},
        replyText: String,
        replyDate: Date,
        copied: [{ type: ObjectId, ref: 'Employee' }]
    });
    app.db.model('DisciplinaryAction', disciplinaryActionSchema);

};
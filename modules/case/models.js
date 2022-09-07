module.exports = function (app, mongoose) {
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var caseSchema = new mongoose.Schema({
        title: { type: String, required: true },
        description: { type: String },
        initiator: { type: ObjectId, ref: 'Employee' },
        leader: { type: String, ref: 'Employee', required: true },
        date: { type: Date, required: true },
        members: [{ type: ObjectId, ref: 'Employee' }],
        location: { type: String, enum: ['Lagos', 'Abuja'], required: true },
        batch: { type: Number, required: true },
        stat: { sub: Number, sup: Number },
        full: { type: Boolean, default: false },
        closed: { type: Boolean, default: false },
        closeDate : {type: Date}
    });
    caseSchema.index({ title: 1 }, { unique: true });
    //caseSchema.index({ initiator: 1, full: false }, { unique: 1 });
    app.db.model('Case', caseSchema);

    var allocator = new mongoose.Schema({
        employee: { type: ObjectId, ref: 'Employee', required: true },
        allocated: [{ type: ObjectId, ref: 'Employee' }],
        added: { type: String, default: new Date(new Date().toString()) },
        status: { type: String, enum: ['Recycled', 'Open'], required: true },
        cycles: Number,
        batch: Number
    });
    app.db.model('Allocator', allocator);
};
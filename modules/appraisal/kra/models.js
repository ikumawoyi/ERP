module.exports = function (app, mongoose) {
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var kraAreaSchema = new mongoose.Schema({
        name: { type: String, required: true, unique: true },
        kras: [{ type: ObjectId, ref: 'KRA' }]
    });
    app.db.model('KraArea', kraAreaSchema);

    var kraSchema = new mongoose.Schema({
        area: { type: ObjectId, ref: 'KraArea', required: true },
        department: { type: ObjectId, ref: 'Organisation', required: true },
        description: { type: String, required: true },
        designations: [{ type: String, enum: app.constants.designations }],
        weight: { type: Number, default: 1 }
    });
    app.db.model('KRA', kraSchema);

    //var kraAppraisalSchema = new mongoose.Schema({
    //    employeeId: {type:String, required:true},
    //    name: {type:String, required:true},//employee name
    //    department:{type:String, required:true},
    //    kra: {type:mongoose.Schema.Types.ObjectId, ref:'KRA', required:true},
    //    area: {type:mongoose.Schema.Types.ObjectId, ref:'KraArea', required:true},
    //    period: {type:mongoose.Schema.Types.ObjectId, ref:'AppraisalPeriod', required:true},
    //    achievement:{type:String, default:''},
    //    date: {type:Date},
    //    score:{type:String},
    //    scoreBy:{type:String},
    //    scoreDate:{type:Date}
    //});
    var kraAppraisalSchema = new mongoose.Schema({
        employee: { type: ObjectId, ref: 'Employee', required: true },
        details: {
            id: { type: ObjectId },
            kra: { type: String },
            area: { type: String },
            catW: { type: Number, default: 1 }
        },
        scoring: {
            score: Number,
            text: String,
            by: String,
            date: Date
        },
        period: { type: ObjectId, ref: 'AppraisalPeriod', required: true },
        achievement: { type: String, default: '' },
        date: { type: Date }
    });
    kraAppraisalSchema.index({ period: 1, employee: 1, 'details.id': 1 }, { unique: true });
    kraAppraisalSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('KraAppraisal', kraAppraisalSchema);
};
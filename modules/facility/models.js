module.exports = function (app, mongoose) {
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var assetTypeSchema = new mongoose.Schema({
        name: { type: String, required: true, unique: true },
        code: { type: String, required: true, unique: true },
        shared: { type: Boolean, default: false },
        department: { type: ObjectId, ref: 'Organisation', required: true },
        designations: [String],
        assets: [{ type: ObjectId, ref: 'Asset' }]
    });
    app.db.model('AssetType', assetTypeSchema);

    var assetLocationSchema = new mongoose.Schema({
        name: { type: String, required: true, unique: true },
        assets: [{ type: ObjectId, ref: 'Asset' }]
    });
    app.db.model('Location', assetLocationSchema);

    var assetSchema = new mongoose.Schema({
        type: { type: ObjectId, ref: 'AssetType', required: true },
        code: { type: String, required: true },
        serial: String,
        displayName: String,
        puchased: { type: Date },
        status: { type: String },
        state: { type: String, default: 'Good' },
        location: { type: ObjectId, ref: 'Location', required: true },
        manufacturer: String,
        description: String,
        tickets: [{ type: ObjectId, ref: 'AssetTicket' }],
        assigned: [{ type: ObjectId, ref: 'Employee', required: true }],
        assignedDate: Date,
        lastRepaired: Date,
        date: { type: Date, default: new Date(new Date().toString()) }
    });
    app.db.model('Asset', assetSchema);

    var ticketSchema = new mongoose.Schema({
        date: { type: Date, default: new Date() },
        code: { type: String },
        description: { type: String, required: true },
        type: { type: ObjectId, ref: 'AssetType', required: true },
        asset: { type: ObjectId, ref: 'Asset', required: true },
        location: { type: ObjectId, ref: 'Location', required: true },
        priority: { type: String },
        propDate: Date,
        fixedDate: Date,
        reply: String,
        replyBy: String,
        replyDate: Date,
        subDetails: [{ type: String, by: String, date: Date, text: String }],
        status: { type: String },
        isClosed: { type: Boolean, default: false }
    });
    app.db.model('AssetTicket', ticketSchema);

}
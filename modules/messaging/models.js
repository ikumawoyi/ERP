module.exports = function (app, mongoose) {
   var mailMessageSchema = new mongoose.Schema({
        recipient: String,
        recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        sender: String,
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        title: { type: String, default: '' },
        many: {
            department: String,
            designations: [String],
            employees: []
        },
        text: String,
        moreText: String,
        type: { type: String, enum: app.constants.msgTypes },
        date: { type: Date, default: new Date() },
        read: { type: Boolean, default: false },
        important: { type: Boolean, default: false },
        isBroadcast: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
        parentMail: { type: mongoose.Schema.Types.ObjectId, ref: 'mailMessage' }
    });
   app.db.model('MailMessage', mailMessageSchema);

    var outMessageSchema = new mongoose.Schema({
        from: { type: String, required: true },
        to: { type: String, required: true },
        content: { type: String, required: true },
        cc: { type: String },
        bcc: { type: String},
        status: { type: String, required: true, enum:['Failed', 'Sent'] },
        date: { type: Date },
        data : String
    });
    app.db.model('OutMessage', outMessageSchema);
    
};
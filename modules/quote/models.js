module.exports = function(app, mongoose){
    var dayQuoteSchema = new mongoose.Schema({
        title: { type: String, required: true },
        date: { type: Date, required: true},
        text: { type: String },
        theme: { type: String },
        by: { type: String },
        created: { type: Date, default: new Date() }
    });
    app.db.model('Quote', dayQuoteSchema);
};
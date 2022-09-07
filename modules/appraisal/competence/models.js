module.exports = function (app, mongoose) {
var performanceCompetenceCategorySchema = new mongoose.Schema({
        header: { type: String, required: true, unique: true },
        questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PerformanceCompetenceQ' }],
        weight: { type: Number, default: 1 },
        filter: {}//{ 'Finance': {'Manager': 0}}
    });
    app.db.model('PerformanceCompetenceCategory', performanceCompetenceCategorySchema);

    var performanceCompetenceQSchema = new mongoose.Schema({
        name: { type: String, required: true },
        description: { type: String, required: true },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'PerformanceCompetenceCategory', required: true },
        weight: { type: Number, default: 1 },
        filter: {} //{ 'Finance': {'Manager': 0}}
    });
    app.db.model('PerformanceCompetenceQ', performanceCompetenceQSchema);

    var performanceCompetenceSchema = new mongoose.Schema({
        employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
        details: {
            id: mongoose.Schema.Types.ObjectId,
            category: String,
            description: String,
            name: String,
            catW: Number,
            qetW: Number
        },
        scoring: {
            score: Number,
            text: String,
            by: String,
            date: Date
        },
        period: { type: mongoose.Schema.Types.ObjectId, ref: 'AppraisalPeriod', required: true },
        date: { type: Date, required: true }
    });
    performanceCompetenceSchema.index({ period: 1, employee: 1, 'details.id': 1 }, { unique: true });
    performanceCompetenceSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('PerformanceCompetence', performanceCompetenceSchema);

};
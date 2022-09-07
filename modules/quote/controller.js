//#region Quote of the Day

exports.getTodaysQuote = function (req, res) {
    var date = new Date(); var m = date.getMonth(), d = date.getDate();
    //var query = '(this.dob.getMonth() == 6 && this.dob.getDate() == 1';
    if(!req.user) return res.status(401).end('Session timed out. Please relogin to continue');
    var query = ' return this.dob &&  this.dob.getMonth() == '+ m + ' && this.dob.getDate() == '+ d;
    req.app.db.models.Quote.find({ date: new Date(new Date().toDateString()) }, '-created -by', function (er, quote) {
        var quotes = quote || [];
        req.app.db.models.Employee
            //.aggregate(
            //    [{
            //        $match: {
            //            dob: {
            //                $ne: undefined
            //            }
            //        }
            //    } ,{
            //        $project : {
            //            _id:0, id: "$_id",
            //            month: {
            //                $month: "$dob"
            //            },
            //            day: {
            //                $dayOfMonth: "$dob"
            //            },
            //            dob: 1,
            //            access:1,
            //            designation:1,
            //            department:1,
            //            first: "$firstName",
            //            last:"$lastName"
            //        }
            //}, {
            //    $match: {
            //        month: { $gt: m }
            //        //, day: d + 1
            //    }
            //}],
                .find({$where: query, status :{$ne: 'Inactive'}},
                function (e, t) {
                    //var birthdays = (t || [])//.filter(function (e, i) {
                    ////    if (e.dob) {
                    ////        var date = new Date(e.dob);
                    ////        return date.getDate() == d && date.getMonth() == m;
                    ////    } else return false;
                    ////});
                    var birthdays = (t || [])//.filter(function(i){ return new Date(i.dob).getMonth() == m && new Date(i.dob).getDate() == d && i.id != id});
                    if (birthdays.length > 0) {
                        req.app.db.models.Organisation.populate(birthdays, {path: 'department'}, function () {
                            birthdays = birthdays.map(function (i) {
                                var name = i.fullName();
                                return {
                                    title: 'Birthday',
                                    text: 'Happy birthday, ' + (i.access == 'M' ? 'FA' : name),
                                    name: i.access == 'M' ? 'FA' : name,
                                    isBirthday: true,
                                    designation: i.designation,
                                    department: i.department.name
                                };
                            });
                            res.json(birthdays.concat(quotes));
                        });
                    } else res.json(quotes);
                });
    });
};
exports.getQuotes = function (req, res) {
    req.app.db.models.Quote.find('-created -by', function (er, quotes) {
        res.json(quotes || []);
    });
};
exports.saveQuote = function (req, res) {
    var quote = req.body;
    var msg = [];
    ['title', 'text', 'date']
        .forEach(function (i) {
            if (!quote[i]) msg.push(req.app.kenna.utility.capitalize(i));
        });
    var dQuote = {
        title: quote.title,
        text: quote.text,
        by: req.user.employee.fullName(),
        created: new Date(),
        date: quote.date || new Date(new Date(quote.date).toDateString()),
        theme: 'Default'
    };
    if (quote._id) {
        req.app.db.models.Quote.findById(quote._id, '-created -by', function (er, q) {
            if (er) res.json({ success: false, message: 'An error occurred while retrieving the quote.' });
            else if (q) {
                if (new Date(q.date) < new Date(new Date().toDateString()))
                    return res.json({ success: false, message: 'An already published quote can not be modified.' });
                req.app.kenna.utility.populate(q, quote);
                q.save(function (er) {
                    if (er) res.json({ success: false, message: 'An error occurred while updating the quote.' });
                    else res.json({ success: true, message: 'Quote successfully updated for ' + q.date.toDateString() });
                });
            } else res.json({ success: false, message: 'Quote was not found..' });
        });
    } else {
        if (new Date(dQuote.date) < new Date(new Date().toDateString()))
            return res.json({ success: false, message: 'Cannot publish quote for the past.' });
        req.app.db.models.Quote.create(dQuote, function (er, q) {
            if (er) res.json({ success: true, message: 'An error occurred while saving the data.', error: er });
            else res.json({ success: true, message: 'Quote successfully added for ' + q.date.toDateString() });
        });
    }
};
//#endregion
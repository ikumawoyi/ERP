/**
 * Created by Ubiri Uzoezi on 1/13/2016.
 */



function pad(n) {
    return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

// today's Date : new Date(new Date().toDateString())
// year Start :  new Date(new Date().getFullYear(),0,1);
// year End : new Date(new Date().getFullYear(),11,31,23,59,59);
// month Start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
// month End: new Date(new Date().getFullYear(), new Date().getMonth(), 1) not done


// DATE
(function () {
    if (typeof Date.today !== 'function')
        Date.today = function () {
            return new Date(new Date().toDateString());
        };

    if (typeof Date.toDate !== 'function')
        Date.toDate = function (date) {
            var d = date ? new Date(date) : new Date();
            d.setHours(0);
            d.setMinutes(0);
            d.setSeconds(0);
            d.setMilliseconds(0);
            return d;
        };

    if (typeof Date.yearStart !== 'function')
        Date.yearStart = function (y) {
            return new Date(y || new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
        };

    if (typeof Date.yearEnd !== 'function')
        Date.yearEnd = function (y) {
            return new Date((y || new Date().getFullYear()) + 1, 0, 1, 0, 0, 0, -1);
        };

    if (typeof Date.formatTime !== 'function')
        Date.formatTime = function (time) {
            var hr = time.getHours();
            var min = time.getMinutes();
            var tt = 12;
            return (tt == 12) ? pad(hr == 0 ? 12 : hr <= 12 ? hr : hr - 12) + ':' + pad(min) + (hr >= 12 ? 'PM' : 'AM') : pad(hr) + ':' + pad(min);
        };


    if (typeof Date.prototype.toEnd !== 'function')
        Date.prototype.toEnd = function () {
            var d = new Date(this);
            d.setHours(23);
            d.setMinutes(59);
            d.setSeconds(59);
            d.setMilliseconds(999);
            return d;
        };

    if (typeof Date.prototype.toDate !== 'function')
        Date.prototype.toDate = function () {
            var d = new Date(this);
            d.setHours(0);
            d.setMinutes(0);
            d.setSeconds(0);
            d.setMilliseconds(0);
            return d;
        };

    if (typeof Date.prototype.getFormattedTime !== 'function')
        Date.prototype.getFormattedTime = function () {
            var hr = this.getHours();
            var min = this.getMinutes();
            var tt = 12;
            return (tt == 12) ? pad(hr == 0 ? 12 : hr <= 12 ? hr : hr - 12) + ':' + pad(min) + (hr >= 12 ? 'PM' : 'AM') : pad(hr) + ':' + pad(min);
        };

    if (typeof Date.prototype.addDayLong !== 'function')
        Date.prototype.addDayLong = function (d) {
            var end = new Date(this);
            var count = 0;
            while (count < d) {
                end.setDate(end.getDate() + 1);
                count++;
            }
            return end;
        };

    if (typeof Date.prototype.addDay !== 'function')
        Date.prototype.addDay = function (d) {
            return new Date(this.getTime() + d * 24 * 36e5);
        };

    if (typeof Date.prototype.getDateTime !== 'function')
        Date.prototype.getDateTime = function () {
            var d = new Date(this);
            d.setHours(0);
            d.setMinutes(0);
            d.setSeconds(0);
            d.setMilliseconds(0);
            return d.getTime();
        };
})();


// STRING
(function () {
    if (typeof String.Concat2 !== 'function')
        String.Concat2 = function () {
            var result = '';
            (Array.prototype.slice.call(arguments) || []).forEach(function (i) {
                result += ' ' + i;
            });
            return result;
        };
    if (typeof String.Concat !== 'function')
        String.Concat = function () {
            var result = '';
            (Array.prototype.slice.call(arguments) || []).forEach(function (i) {
                result += i;
            });
            return result;
        };


    if (typeof String.prototype.endsWith !== 'function')
        String.prototype.endsWith = function (s) {
            return this.length >= s.length && this.substr(this.length - s.length) == s;
        };
    if (typeof String.prototype.startsWith !== 'function')
        String.prototype.startsWith = function (searchString) {
            return this.indexOf(searchString, 0) === 0;
        };
    if (typeof String.prototype.capitalize !== 'function')
        String.prototype.capitalize = function () {
            return this && this[0].toUpperCase() + this.slice(1);
        };
})();


// ARRAY
(function () {
    if (typeof Array.prototype.common !== 'function')
        Array.prototype.common = function (arr) {
            return this.filter(function (i) {
                return arr.indexOf(i) != -1;
            })
        };

})();
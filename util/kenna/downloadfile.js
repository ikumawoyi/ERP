/**
 * Created by Ubiri Uzoezi on 27/04/2015.
 */
module.exports = function (res) {

    var objectToArray = function (item, opt) {
        var r = [];
        opt.forEach(function (i) {
            var h = i.prop.split('.');
            var u = item[h[0]];
            h.forEach(function (t, i) {
                if (i == 0) return;
                u = (u || {})[t] || '';
            });
            if (u instanceof Function || typeof (u) == 'function') {
                switch (h.length) {
                    case 1: u = item[h[0]](); break;
                    case 2: u = item[h[0]][h[1]](); break;
                    case 3: u = item[h[0]][h[1]][h[2]](); break;
                    default:
                }
            }
            if (u instanceof Date) u = u.toLocaleDateString();
            r.push(u);
        });
        return r;
    };
    var objectToArrayInRow = function (item, opt) {
        var r = [];
        opt.forEach(function (i) {
            var h = i.prop.split('.');
            var u = item[h[0]];
            h.forEach(function (t, i) {
                if (i == 0) return;
                u = (u || {})[t] || '';
            });
            if (u instanceof Function || typeof (u) == 'function') {
                switch (h.length) {
                    case 1:
                        u = item[h[0]]();
                        break;
                    case 2:
                        u = item[h[0]][h[1]]();
                        break;
                    case 3:
                        u = item[h[0]][h[1]][h[2]]();
                        break;
                    default:
                }
            }
            if (u instanceof Date) u = u.toLocaleDateString();
            r.push(i.label + ': ' + u);
        });
        return r;
    };

    var map = function (i) {
        if (i == undefined || i == null) return '';
        if (i instanceof Function || typeof (i) == 'function') return i();
        return '" ' + String(i).replace(/\"/g, '""') + '"';
    };
    var prepareData = function (columns, data) {
        var header = columns.map(function (i) { return i.label || i.prop; });
        var result = header.map(map).join(',') + '\r\n';
        if (columns.length == 0) result = [];
        (data || []).forEach(function (item) {
            item = (item instanceof Array) ? item : objectToArray(item, columns);
            result += item.map(map).join(',') + '\r\n';
        });
        return result;
    };
    var sendData = function (body, f) {
        var fn = 'kennaCounsel';
        if (f) {
            f = f.replace(/\./g, '-');
            fn += ('-' + f);
        }
        res.charset = res.charset || 'utf-8';
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment;filename=' + fn + '.csv');
        res.send(body);
    };
    return {
        toArray: objectToArray,
        toData: prepareData,
        toRowArray: objectToArrayInRow,
        sendBody: sendData,
        send: function (c, d, f) { sendData(prepareData(c, d), f); }
    };
};
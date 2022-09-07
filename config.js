/**
 * Created by toluogunremi on 3/12/15.
 */
'use strict';

exports.port = process.env.PORT || 3000;
exports.mongodb = {
    //uri: 'mongodb://kennadbAdmin:kenna.234@ds035270.mongolab.com:35270/kenna-hr'
   //uri: 'mongodb://localhost/kenna-hr'
    uri: 'mongodb://127.0.0.1/kenna-hr'
};
exports.companyName = 'Kenna Partners';
exports.projectName = 'Kenna HR System';
exports.systemEmail = 'hr@kennapartners.com';
exports.cryptoKey = 'k3yb0ardj4t';

exports.recaptchaol = {
    key: '6LenVQMTAAAAAOFCK2LGvfRdbmc0GcUFzSw3SuF4',
    secret: '6LenVQMTAAAAADeP8j6DcwatNcXyiBOJ8GH8-BpZ'
};
exports.recaptcha = {
    key: '6LfwxgMTAAAAACgvL07nP_zCmPvBr9DuGQvNyy0U',
    secret: '6LfwxgMTAAAAAP77SQfli2w_ik93f79MZFsMA8Bj-BpZ'
};
exports.loginAttempts = {
    forIp: 50,
    forIpAndUser: 7,
    logExpiration: '20m'
};
exports.smtp = {
    from: {
        name: process.env.SMTP_FROM_NAME || exports.projectName,
        address: process.env.SMTP_FROM_ADDRESS || exports.systemEmail
    },
    credentials: {
        user: process.env.SMTP_USERNAME || 'trusoftng@gmail.com',
        //user: process.env.SMTP_USERNAME || 'kennacounsel@gmail.com',
        password: process.env.SMTP_PASSWORD || 'cdwtyrcxuoidmpzj',
        //password: process.env.SMTP_PASSWORD || 'Admin@123456',
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        ssl: true
    }
};

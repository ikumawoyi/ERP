/**
 * Created by toluogunremi on 3/12/15.
 */
'use strict';

module.exports = function(config) {
    config.requireAccountVerification = false;
    config.sendWelcomeEmail = false;
    config.defaultUser = {
        username: 'hr',
        email: 'hr@kennapartners.com',
        password: 'kenna.234',
        roles:{
            admin: {
                name: {
                    first: 'Administrator',
                    last: 'System',
                    full: 'System Administrator'
                },
                groups: ['root']
            }
        }
    };
}
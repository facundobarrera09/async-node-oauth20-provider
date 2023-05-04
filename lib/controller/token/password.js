var
    async = require('async'),
    error = require('./../../error'),
    emitter = require('./../../events');
const events = require('./../../events');

module.exports = function(req, oauth2, client, username, password, scope, pCb) {

    // Define variables
    var user;
    var responseObj = {
        token_type:    "bearer"
    };

    async.waterfall([
        // Check username and password parameters
        function(cb) {
            if (!username)
                return cb(new error.invalidRequest('Username is mandatory for password grant type'));
            oauth2.logger.debug('Username parameter check passed: ', username);

            if (!password)
                return cb(new error.invalidRequest('Password is mandatory for password grant type'));
            oauth2.logger.debug('Password parameter check passed: ', password);

            cb();
        },
        // Parse and check scope against supported and client available scopes
        function(cb) {
            oauth2.model.client.transformScope(scope, (err, scopes) => {
                oauth2.model.client.checkScope(client, scopes, (err, selectedScope) => {
                    if (!selectedScope)
                        cb(new error.invalidScope('Invalid scope for the client'));
                    else {
                        scope = selectedScope
                        oauth2.logger.debug('Scope check passed: ', selectedScope);
                        cb();
                    }
                })
            })
        },
        // Fetch user
        function(cb) {
            oauth2.model.user.fetchByUsername(username, function(err, obj) {
                if (err)
                    cb(new error.serverError('Failed to call user::fetchByUsername method'));
                else if (!obj)
                    cb(new error.invalidClient('User not found'));
                else {
                    oauth2.logger.debug('User fetched: ', obj);
                    user = obj;
                    cb();
                }
            });
        },
        // Check provided password
        function(cb) {
            oauth2.model.user.checkPassword(user, password, function(err, valid) {
                if (err)
                    cb(new error.serverError('Failed to call user:checkPassword method'));
                else if (!valid)
                    cb(new error.invalidClient('Wrong user password provided'));
                else
                    cb();
            });
        },
        // Remove old refreshToken (if exists) with userId-clientId pair
        function(cb) {
            oauth2.model.user.getId(user, (err, userId) => {
                oauth2.model.client.getId(client, (err, clientId) => {
                    oauth2.model.refreshToken.removeByUserIdClientId(userId, clientId, function(err) {
                        if (err)
                            cb(new error.serverError('Failed to call refreshToken::removeByUserIdClientId method'));
                        else {
                            oauth2.logger.debug('Refresh token removed');
                            cb();
                        }
                    });
                })
            })
        },
        // Generate new refreshToken and save it
        function(cb) {
            //check if client has grant type refresh_token, if not, it will not be including in response (short time authorization)
            oauth2.model.client.checkGrantType(client, 'refresh_token', (err, correctGrant) => {
                if(!correctGrant){
                    oauth2.logger.debug('Client has not the grant type refresh_token, skip creation');
                    return cb();
                }

                oauth2.model.user.getId(user, (err, userId) => {
                    oauth2.model.client.getId(client, (err, clientId) => {
                        oauth2.model.refreshToken.create(userId, clientId, scope, function(err, data) {
                            if (err)
                                cb(new error.serverError('Failed to call refreshToken::save method'));
                            else {
                                responseObj.refresh_token = data;
                                oauth2.logger.debug('Refresh token saved: ', responseObj.refresh_token);
                                cb();
                            }
                        });
                    })
                })
            })
        },
        // Generate new accessToken and save it
        function(cb) {
            oauth2.model.user.getId(user, (err, userId) => {
                oauth2.model.client.getId(client, (err, clientId) => {
                    oauth2.model.accessToken.create(userId, clientId, scope, oauth2.model.accessToken.ttl, function(err, data) {
                        if (err)
                            cb(new error.serverError('Failed to call accessToken::save method'));
                        else {
                            events.token_granted(req, data)
                            responseObj.access_token = data;
                            responseObj.expires_in = oauth2.model.accessToken.ttl;
                            oauth2.logger.debug('Access token saved: ', responseObj.access_token);
                            cb();
                        }
                    });
                })
            })
        }
    ],
    function(err) {
        if (err) pCb(err);
        else {
            pCb(null, { event: 'token_granted_from_password', data:responseObj});
        }
    });
};
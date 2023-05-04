var
    async = require('async'),
    error = require('./../../error'),
    emitter = require('./../../events');

module.exports = function(req, oauth2, client, sCode, redirectUri, pCb) {

    // Define variables
    var responseObj = {
        token_type:    "bearer"
    };
    var code,
        refreshTokenValue,
        accessTokenValue;

    async.waterfall([
        // Fetch code
        function(cb) {
            oauth2.model.code.fetchByCode(sCode, function(err, obj) {
                if (err)
                    cb(new error.serverError('Failed to call code::fetchByCode method'));
                else if (!obj)
                    cb(new error.invalidGrant('Code not found'))

                oauth2.model.code.getClientId(obj, function(err1, codeClientId) {
                    oauth2.model.client.getId(client, function(err1, clientId) {
                        if (codeClientId != clientId)
                            cb(new error.invalidGrant('Code is issued by another client'));

                        oauth2.model.code.checkTTL(obj, function(err1, correctTtl) {
                            if (!correctTtl)
                                cb(new error.invalidGrant('Code is already expired'));
                            else {
                                oauth2.logger.debug('Code fetched: ', obj);
                                code = obj;
                                cb();
                            }
                        })
                    })
                })
            });
        },
        // @todo: clarify. Check redirectUri? Weird standard, why should we?
        // Remove old refreshToken (if exists) with userId-clientId pair
        function(cb) {
            oauth2.model.code.getUserId(code, (err, userId) => {
                oauth2.model.code.getClientId(code, (err, clientId) => {
                    oauth2.model.refreshToken.removeByUserIdClientId(userId, clientId, function(err) {
                        if (err) {
                            cb(new error.serverError('Failed to call refreshToken::removeByUserIdClientId method'));
                        }
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
    
                oauth2.model.refreshToken.create(oauth2.model.code.getUserId(code), oauth2.model.code.getClientId(code), oauth2.model.code.getScope(code), function(err, data) {
                    if (err)
                        cb(new error.serverError('Failed to call refreshToken::save method'));
                    else {
                        responseObj.refresh_token = data;
                        oauth2.logger.debug('Refresh token saved: ', responseObj.refresh_token);
                        cb();
                    }
                });
            })
        },
        // Generate new accessToken and save it
        function(cb) {
            oauth2.model.code.getUserId(code, (err, userId) => {
                oauth2.model.code.getClientId(code, (err, clientId) => {
                    oauth2.model.code.getScope(code, (err, scope) => {
                        oauth2.model.accessToken.create(userId, clientId, scope, oauth2.model.accessToken.ttl, function(err, data) {
                            if (err)
                                cb(new error.serverError('Failed to call accessToken::save method'));
                            else {
                                emitter.token_granted(req, data)
                                responseObj.access_token = data;
                                responseObj.expires_in = oauth2.model.accessToken.ttl;
                                oauth2.logger.debug('Access token saved: ', responseObj.access_token);
                                cb();
                            }
                        });
                    })
                })
            })
            
        },
        // Remove used code
        function(cb) {
            oauth2.model.code.removeByCode(sCode, function(err) {
                if (err)
                    cb(new error.serverError('Failed to call code::removeByCode method'));
                else {
                    oauth2.logger.debug('Code removed');
                    cb();
                }
            });
        }
    ], function(err) {
        if (err) pCb(err);
        else pCb(null, responseObj);
    });

};
var
    async = require('async'),
    response = require('./../../util/response.js'),
    error = require('./../../error'),
    emitter = require('./../../events');

module.exports = function(req, oauth2, client, scope, pCb) {

    // Define variables
    var scope,
        accessTokenValue;
    var responseObj = {
        token_type:    "bearer"
    };

    async.waterfall([
        // Parse and check scope against supported and client available scopes
        function(cb) {
            oauth2.model.client.transformScope(scope, (err, scopes) => {
                oauth2.model.client.checkScope(client, scopes, (err, selectedScopes) => {
                    if (!selectedScopes)
                        cb(new error.invalidScope('Invalid scope for the client'));
                    else {
                        scope = selectedScopes
                        oauth2.logger.debug('Scope check passed: ', selectedScopes);
                        cb();
                    }
                })
            })
        },
        // Generate new accessToken and save it
        function(cb) {
            oauth2.model.client.getId(client, (err, clientId) => {
                oauth2.model.accessToken.create(null, clientId, scope, oauth2.model.accessToken.ttl, function(err, data) {
                    if (err)
                        cb(new error.serverError('Failed to call accessToken::save method'));
                    else {
                        emitter.token_granted(req, data)
                        responseObj.access_token = data;
                        responseObj.expires_in = oauth2.model.accessToken.ttl;
                        oauth2.logger.debug('Access token saved: ', accessTokenValue);
                        cb();
                    }
                });
            })
        }
    ],
    function(err) {
        if (err) pCb(err);
        else {
            pCb(null, { event: 'token_granted_from_client_credentials', data:responseObj});
        }
    });
};
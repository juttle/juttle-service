//
// In order for the exported logSetup utility function to actually take effect,
// we need to export the getLogger function from the same log4js module that was
// configured by logSetup, so export it here.
//
var getLogger = require('log4js').getLogger;

module.exports = {
    service: require('./lib/juttle-service'),
    version: require('./lib/version'),
    logSetup: require('./lib/log-setup'),
    // Exposing cliErrors (for juttle-engine to access) is a temporary hack.
    cliErrors: require('juttle/lib/cli/errors'),
    getLogger: getLogger,
    JuttleBundler: require('./lib/bundler'),
    WebsocketEndpoint: require('./lib/websocket-endpoint'),
    client: require('./lib/juttle-service-client')
};

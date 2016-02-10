'use strict';
var _ = require('underscore');
var express = require('express');
var logger = require('log4js').getLogger('juttle-service');

var logSetup = require('./log-setup');
var read_config = require('juttle/lib/config/read-config');
var Juttle = require('juttle/lib/runtime').Juttle;
var JuttleBundler = require('./bundler');
var WebsocketEndpoint = require('./websocket-endpoint');
var JuttleServiceClient = require('./juttle-service-client');

// Exposed handler for registering routes on an express app
var addRoutes = require('./routes');

// Load the juttle configuration from either options.config_path or the
// default juttle configuration locations.
function configure(options) {
    if (! _.has(options, 'config')) {
        let config = read_config(options);

        // Add the config as an option so addRoutes doesn't have to read it again.
        options.config = config;
    }

    Juttle.adapters.configure(options.config.adapters);
}

// Simple wrapper class around a running instance of the service.
class JuttleService {
    constructor(options) {
        configure(options);

        this._app = express();

        this._app.disable('x-powered-by');

        addRoutes(this._app, options);

        this._server = this._app.listen(options.port, () => {
            logger.info('Juttle service listening at http://localhost:' + options.port + ' with root directory:' + options.root_directory);
        });
    }

    stop() {
        this._server.close();
    }
}

// Hook to run a new instance of the service
function run(options) {
    return new JuttleService(options);
}

module.exports = {
    service: {
        configure: configure,
        run: run,
        addRoutes: addRoutes
    },
    logSetup: logSetup,
    bundler: JuttleBundler,
    websocketEndpoint: WebsocketEndpoint,
    client: JuttleServiceClient
};

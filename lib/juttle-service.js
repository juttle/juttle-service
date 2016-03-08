'use strict';
var path = require('path');
var _ = require('underscore');
var express = require('express');
var logger = require('log4js').getLogger('juttle-service');
var read_config = require('juttle/lib/config/read-config');
var JuttleAdapters = require('juttle/lib/runtime/adapters');

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

    JuttleAdapters.configure(options.config.adapters);
}

// Simple wrapper class around a running instance of the service.
class JuttleService {
    constructor(options) {
        configure(options);

        if (!options.root_directory) {
            throw new Error('must provide option root_directory');
        }

        if (!path.isAbsolute(options.root_directory)) {
            throw new Error('root_directory path must be absolute');
        }

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
    configure: configure,
    run: run,
    addRoutes: addRoutes
};

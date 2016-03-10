'use strict';
var path = require('path');
var _ = require('underscore');
var express = require('express');
var logger = require('log4js').getLogger('juttle-service');
var read_config = require('juttle/lib/config/read-config');
var JuttleAdapters = require('juttle/lib/runtime/adapters');

// Exposed handler for registering routes on an express app
var addRoutes = require('./routes');

const DEFAULT_CONFIG = {
    port: 2000,
    root: process.cwd(),
    daemonize: false,
    output: false,
    'log-config': false,
    'log-level': 'info',
    'log-default-output': '/var/log/juttle-service.log',
    max_saved_messages: 1024,
    delayed_job_cleanup: 10000,
    delayed_endpoint_close: 10000,
    compress_response: true
};

// Starting with a default configuration for the service, update it
// with any (command-line) options in options and any values from the
// juttle config file (either at the location options.config or the
// default location). Return the resulting configuration for the
// juttle service.
//
// Additionally, call JuttleAdapters.configure() so this process has a
// list of adapters it can return in /version-info.

function configure(options) {

    // Read juttle-config.{js,json} and add defaults for anything not
    // specified.
    let juttle_config = read_config({config_path: options.config});
    JuttleAdapters.configure(juttle_config.adapters);

    let config = {};

    if (_.has(juttle_config, 'juttle-service')) {
        config = juttle_config['juttle-service'];
    }

    _.defaults(config, DEFAULT_CONFIG);

    // Also let any command-line arguments or directly provided
    // configuration override defaults. The one exception to this is
    // options['config'], which is actually the path to a config file
    // to read, and not a configuration item itself. So that is
    // ignored.

    _.extend(config, _.omit(options, 'config'));

    // Ensure the root is a full path
    config.root = path.resolve(config.root);

    return config;
}

// Simple wrapper class around a running instance of the service.
class JuttleService {
    constructor(config, config_path) {
        this._app = express();

        this._app.disable('x-powered-by');

        addRoutes(this._app, config, config_path);

        this._server = this._app.listen(config.port, () => {
            logger.info('Juttle service listening at http://localhost:' + config.port + ' with root directory:' + config.root);
        });
    }

    stop() {
        this._server.close();
    }
}

// Hook to run a new instance of the service
function run(config, config_path) {
    return new JuttleService(config, config_path);
}

module.exports = {
    default_config: DEFAULT_CONFIG,
    configure: configure,
    run: run,
    addRoutes: addRoutes
};

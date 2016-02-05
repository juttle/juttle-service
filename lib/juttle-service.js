'use strict';
var express = require('express');
var logger = require('log4js').getLogger('juttle-service');

var read_config = require('juttle/lib/config/read-config');
var Juttle = require('juttle/lib/runtime').Juttle;
var add_routes = require('./routes');

class JuttleService {

    constructor(options) {

        let config = read_config(options);

        // Add the config as an option so add_routes doesn't have to read it again.
        options.config = config;
        Juttle.adapters.configure(config.adapters);

        this._app = express();

        this._app.disable('x-powered-by');

        add_routes(this._app, options);

        this._server = this._app.listen(options.port, () => {
            logger.info('Juttle service listening at http://localhost:' + options.port + ' with root directory:' + options.root_directory);
        });
    }

    stop() {
        this._server.close();
    }

}

module.exports = JuttleService;

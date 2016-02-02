'use strict';
var express = require('express');
var expressWs = require('express-ws');
var logger = require('log4js').getLogger('juttle-engine');

var read_config = require('juttle/lib/config/read-config');
var Juttle = require('juttle/lib/runtime').Juttle;
var JuttleExpressRoutes = require('./express-routes');

class JuttleEngine {

    constructor(options) {

        let config = read_config(options);
        Juttle.adapters.configure(config.adapters);

        this._app = express();
        expressWs(this._app);

        this._app.disable('x-powered-by');

        JuttleExpressRoutes.add_routes(this._app, options);

        // add cors headers, allow ALL origins
        this._app.use(function (req, res, next) {

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

            // Pass to next layer of middleware
            next();
        });

        this._server = this._app.listen(options.port, () => {
            logger.info('Juttle engine listening at http://localhost:' + options.port + ' with root directory:' + options.root_directory);
        });
    }

    stop() {
        this._server.close();
    }

}

module.exports = JuttleEngine;

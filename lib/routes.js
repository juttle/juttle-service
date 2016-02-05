'use strict';
var _ = require('underscore');
var express = require('express');
var expressWs = require('express-ws');
var bodyParser = require('body-parser');
var compression = require('compression');
var jobs = require('./job-handlers');
var paths = require('./path-handlers');
var prepares = require('./prepare-handlers');
var logger = require('log4js').getLogger('juttle-express-router');

var JuttleServiceErrors = require('./errors');

var API_PREFIX = '/api/v0';

function default_error_handler(err, req, res, next) {
    logger.debug('got error "' + err.message + '"');

    // Errors from bodyParser.json() might appear here. Transform
    // them into the error formats we expect.
    if (err.message.startsWith('Unexpected token')) {
        err = JuttleServiceErrors.bundleError(err.message, err.body);
    } else if (! JuttleServiceErrors.is_juttled_error(err)) {
        // This error isn't one of the standard errors in
        // JuttledErrors. Wrap the error in an UnknownError.
        err = JuttleServiceErrors.unknownError(err);
    }

    res.status(err.status).send(err);
}

function add_routes(app, options) {

    let max_saved_messages = 1024;
    let delayed_job_cleanup = 10000;
    let delayed_endpoint_close = options.delayed_endpoint_close || 10000;
    let compress_response = true;

    if (_.has(options.config, 'juttled')) {
        if (_.has(options.config.juttled, 'max_saved_messages')) {
            max_saved_messages = options.config.juttled.max_saved_messages;
        }

        if (_.has(options.config.juttled, 'delayed_job_cleanup')) {
            delayed_job_cleanup = options.config.juttled.delayed_job_cleanup;
        }

        if (_.has(options.config.juttled, 'delayed_endpoint_close')) {
            delayed_endpoint_close = options.config.juttled.delayed_endpoint_close;
        }

        if (_.has(options.config.juttled, 'compress_response')) {
            compress_response = options.config.juttled.compress_response;
        }
    }

    jobs.init({max_saved_messages: max_saved_messages,
               delayed_job_cleanup: delayed_job_cleanup,
               delayed_endpoint_close: delayed_endpoint_close,
               config_path: options.config_path,
               root_directory: options.root_directory});
    paths.init({root_directory: options.root_directory});

    // Create an express router to handle all the non-websocket
    // routes.
    let router = express.Router();

    if (compress_response) {
        router.use(compression());
    }

    router.get('/jobs',
               jobs.list_all_jobs);
    router.get('/jobs/:job_id',
               jobs.list_job);
    router.delete('/jobs/:job_id',
                  jobs.delete_job);
    router.post('/jobs',
                bodyParser.json(), jobs.create_job);
    router.get('/observers/',
               jobs.list_observers);

    router.get('/paths/*',
               bodyParser.json(), paths.get_path);
    router.get('/directory',
               bodyParser.json(), paths.get_dir);

    router.post('/prepare',
                bodyParser.json(), prepares.get_inputs);

    router.use(default_error_handler);

    app.use(API_PREFIX, router);

    // For the websocket routes, we need to add them directly to the
    // app, as the package we use (express-ws) doesn't support adding
    // websocket-based paths to routers (see
    // https://github.com/HenningM/express-ws/issues/8).

    if (! app.ws) {
        expressWs(app);
    }

    app.ws(API_PREFIX + '/jobs/:job_id',
              jobs.subscribe_job);
    app.ws(API_PREFIX + '/observers/:observer_id',
              jobs.subscribe_observer);
    app.ws('/rendezvous/:topic',
              paths.rendezvous_topic);

    return router;
}

module.exports = add_routes;

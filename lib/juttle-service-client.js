'use strict';

/* eslint no-console: 0 */
var _ = require('underscore');
var Promise = require('bluebird');
var WebSocket = require('ws');
var minimist = require('minimist');
var rp = require('request-promise');
var path = require('path');
var cli_errors = require('juttle/lib/cli/errors');
var rp_errors = require('request-promise/errors');
var JuttleBundler = require('../lib/bundler');
var fs = require('fs');
var crypto = require('crypto');


// service_option is the name of the argument for the service
// (juttle-engine or juttle-service). addl_commands/addl_options can
// be provided to include additional commands/options on top of the
// commands/options supported here.

let service_option = 'juttle-service';
let addl_commands = [];
let addl_options = [];

function init(options) {
    service_option = options.service_option;
    addl_commands = options.addl_commands;
    addl_options = options.addl_options;
}

function usage() {
    console.log('usage: [--' + service_option + ' <hostname:port>] [--help] [COMMAND] [OPTIONS]');
    console.log('   [COMMAND]: one of the following, with the following options:');
    console.log('         subscribe (--job <job-id>|--observer <observer-id>)');
    console.log('         list_jobs [--job <job-id>]');
    console.log('         list_observers');
    console.log('         run --path <path> [--wait] [--observer <observer-id>]');
    console.log('         delete --job <job-id>');
    console.log('         get_inputs --path <path> --input name=val [--input name=val ...]');
    for (let command of addl_commands) {
        console.log('         ' + command);
    }
    console.log('   [OPTIONS]: one of the following:');
    console.log('       --path <path-to-juttle-file>:          Path to file relative to configured root directory.');
    console.log('                                              Used by "run", "get_inputs", "push", "watch".');
    console.log('       --wait                                 If true, wait for program to finish');
    console.log('                                                (default false, job starts in background)');
    console.log('       --input name=val:                      One or more input values.');
    console.log('                                              Used by "get_inputs".');
    console.log('       --job <job-id>:                        Job id.');
    console.log('                                              Used by "subscribe", "list_jobs", "delete".');
    console.log('       --observer <observer-id>:              Observer id.');
    console.log('                                              Used by "subscribe", "run"');
    console.log('       --juttle-service <hostname:port>:       Hostname/port of juttle-service juttle server');
    for (let option of addl_options) {
        console.log('         ' + option);
    }
    console.log('       --help:                                Print this help and exit');
    process.exit(1);
}

function handle_error(err, filename) {

    // The error returned when the request-promise module rejects a
    // promise due to a non-200 status contains an error property that
    // contains the body of the response. (Other errors may not
    // contain this property). If this exists and is JSON, parse it
    // and look for a location. Otherwise, just print the error
    // message.

    let err_obj;
    try {
        err_obj = JSON.parse(err.error);
    } catch (e) {
        // err did not contain a error property or it was not
        // json.
        console.error('ERROR', err.message);
        return;
    }

    // If it's a juttle error containing a program
    // location, print the error in context.
    if (err_obj.code === 'JS-JUTTLE-ERROR') {
        console.error(cli_errors.show_in_context({err: err_obj.info.err,
                                                  program: err_obj.info.bundle.program,
                                                  modules: err_obj.info.bundle.modules,
                                                  filename: filename}));
    } else {
        console.error('ERROR', err.message);
    }
}

function read_inputs(opts) {

    let inputs = {};
    if (opts.input !== undefined) {
        if (! _.isArray(opts.input)) {
            opts.input = [opts.input];
        }
        _.each(opts.input, function(x) {
            let L = x.split('=');
            if (L.length !== 2) {
                console.error('error: invalid input', x);
                usage();
            }
            let num = +L[1];
            inputs[L[0]] = isNaN(num) ? L[1] : num;
        });
    }

    return inputs;
}

function handle_command(opts, command) {

    let API_PREFIX = '/api/v0';

    let svc_ws_url = 'ws://' + opts.juttle_service + API_PREFIX;
    let svc_http_url = 'http://' + opts.juttle_service + API_PREFIX;

    switch (command) {

        case 'list_jobs':
            let job_id = opts.job || '';

            rp(svc_http_url + '/jobs/' + job_id)
                .then(function(body) {
                    console.log(JSON.stringify(JSON.parse(body), null, 2));
                }).error(function(e) {
                    console.error('ERROR', e.message);
                });

            break;

        case 'list_observers':

            rp(svc_http_url + '/observers/')
                .then(function(body) {
                    console.log(JSON.stringify(JSON.parse(body), null, 2));
                }).error(function(e) {
                    console.error('ERROR', e.message);
                });

            break;

        case 'subscribe':
            let ws;

            if (opts.observer !== undefined) {
                console.log('Subscribing to all jobs associated with observer:', opts.observer);
                ws = new WebSocket(svc_ws_url + '/observers/' + opts.observer);
                ws.on('message', function(message) {
                    console.log('received: %s', message);
                    let msg = JSON.parse(message);
                    if (msg.type === 'ping') {
                        ws.send(JSON.stringify({type: 'pong'}));
                    }
                });
                ws.on('close', function(message) {
                    console.log('Web socket connection closed, exiting');
                    process.exit(0);
                });
            } else if (opts.job !== undefined) {
                console.log('Subscribing to job:', opts.job);
                ws = new WebSocket(svc_ws_url + '/jobs/' + opts.job);
                ws.on('message', function(message) {
                    console.log('received: %s', message);
                    let msg = JSON.parse(message);
                    if (msg.type === 'ping') {
                        ws.send(JSON.stringify({type: 'pong'}));
                    }
                });

                ws.on('close', function(message) {
                    console.log('Web socket connection closed, exiting');
                    process.exit(0);
                });
            } else {
                usage();
            }

            break;

        case 'delete':
            if (opts.job !== undefined) {
                rp({method: 'DELETE', uri: svc_http_url + '/jobs/' + opts.job})
                    .then(function(body) {
                        console.log(JSON.stringify(JSON.parse(body), null, 2));
                    }).error(function(e) {
                        console.error('ERROR', e.message);
                    });
            } else {
                usage();
            }

            break;

        case 'run':
            if (opts.path !== undefined) {

                let runInputs = read_inputs(opts);

                rp(svc_http_url + '/paths/' + opts.path)
                    .then(function(body) {
                        body = JSON.parse(body);
                        return body.bundle;
                    }).then(function(bundle) {
                        let body = {
                            bundle: bundle,
                            inputs: runInputs,
                            wait: opts.wait
                        };
                        if (opts.observer) {
                            body.observer = opts.observer;
                        }
                        let post_opts = {
                            method: 'POST',
                            uri: svc_http_url + '/jobs',
                            headers: {
                                'Content-type': 'application/json'
                            },
                            body: JSON.stringify(body)
                        };

                        if (opts.wait) {
                            console.log('Starting program and waiting for it to finish...');
                        }
                        return rp(post_opts)
                            .then(function(body) {
                                if (opts.wait) {
                                    console.log('Job output:\n' + JSON.stringify(JSON.parse(body), null, 2));
                                } else {
                                    console.log('Started job', body);
                                }
                            });
                    }).catch(rp_errors.RequestError, function (e) {
                        console.error('ERROR', e.message);
                    }).error(function(e) {
                        handle_error(e, opts.path);
                    });
            } else {
                usage();
            }

            break;

        case 'get_inputs':
            let getInputs = read_inputs(opts);

            rp(svc_http_url + '/paths/' + opts.path)
                .then(function(body) {
                    body = JSON.parse(body);
                    return body.bundle;
                }).then(function(bundle) {
                    let body = {
                        bundle: bundle,
                        inputs: getInputs
                    };
                    let post_opts = {
                        method: 'POST',
                        uri: svc_http_url + '/prepare',
                        headers: {
                            'Content-type': 'application/json'
                        },
                        body: JSON.stringify(body)
                    };
                    return rp(post_opts)
                        .then(function(body) {
                            console.log(JSON.stringify(JSON.parse(body), null, 2));
                        });
                }).catch(rp_errors.RequestError, function (e) {
                    console.error('ERROR', e.message);
                }).error(function(e) {
                    handle_error(e, opts.path);
                });

            break;

        default:
            usage();
    }
}

module.exports = {
    init: init,
    usage: usage,
    handle_command: handle_command
};


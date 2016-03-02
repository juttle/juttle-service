'use strict';

// This script is intended for use as a spawned subprocess by
// JuttleJob. It waits for a message from the parent containing the
// job id and program to run, compiles the program, writes the set of
// view descriptors as a message, and then streams the data for the
// views as messages.

// Before any other modules are loaded, override the juttle logging subsystem to
// create a wrapper that sends logs to be emitted by the parent process.
var JuttleLogger = require('juttle/lib/logger');
JuttleLogger.getLogger = function(name) {
    function log(level, args) {
        send({
            type: 'log',
            name: name,
            time: new Date().toISOString(),
            level: level,
            arguments: args
        });
    }

    return {
        debug: function() {
            return log('debug', Array.prototype.slice.call(arguments, 0));
        },
        info: function() {
            return log('info', Array.prototype.slice.call(arguments, 0));
        },
        warn: function() {
            return log('warn', Array.prototype.slice.call(arguments, 0));
        },
        error: function() {
            return log('error', Array.prototype.slice.call(arguments, 0));
        }
    };
};

var _ = require('underscore');
/* jshint node: true */

var logger = JuttleLogger.getLogger('juttle-subprocess');

var read_config = require('juttle/lib/config/read-config');
var JuttleAdapters = require('juttle/lib/runtime/adapters');
var JuttleErrors = require('juttle/lib/errors');

// The only argument to this process is the path to the config
// file. May not be provided, in which case a default set of search
// paths will be used.
var compiler = require('juttle/lib/compiler');
var optimize = require('juttle/lib/compiler/optimize');
var views_sourceinfo = require('juttle/lib/compiler/flowgraph/views_sourceinfo');
var implicit_views = require('juttle/lib/compiler/flowgraph/implicit_views');

var JSDP = require('juttle-jsdp');
var JSDPValueConverter = require('./jsdp-value-converter');

var config = read_config({config_path: process.argv[2]});
JuttleAdapters.configure(config.adapters);

var running_program;

function send(msg) {
    process.send(JSDP.serialize(JSDPValueConverter.convertToJSDPValue(msg), { toObject: true }));
}

process.on('message', function(msg) {

    if (msg.cmd === 'stop') {
        logger.debug('stop: program is ', running_program ? 'active' : 'not active');
        if (running_program) {
            running_program.deactivate();
        }
        process.exit(0);
    } else if (msg.cmd === 'run') {
        var bundle = msg.bundle;

        // Run the juttle program. The two things written to standard out are:
        //  - A description of the views
        //  - A stream of all the data for the views

        logger.info('starting-juttle-program', bundle.program);

        var compile_options = {
            stage: 'eval',
            fg_processors: [implicit_views(config.implicit_view), optimize, views_sourceinfo],
            inputs: JSDPValueConverter.convertToJuttleValue(JSDP.deserialize(msg.inputs || {})),
            modules: msg.bundle.modules
        };

        compiler.compile(msg.bundle.program, compile_options)
        .then(function(program) {
            // Maps from channel to view id
            var view_descs = _.map(program.get_views(program), function(view) {
                return {
                    type: view.name,
                    view_id: view.channel,
                    options: view.options
                };
            });

            send({
                type: 'program_started',
                views: view_descs
            });

            // Start listening for callbacks from the interpreter for
            // errors/warnings/view data.
            program.events.on('error', function(msg, err) {
                logger.error(msg, err);
                send({
                    type: 'error',
                    error: {
                        code: err.code,
                        message: err.message,
                        info: err.info
                    }
                });
            });

            program.events.on('warning', function(msg, warn) {
                logger.warn(msg, warn);
                send({
                    type: 'warning',
                    warning: {
                        code: warn.code,
                        message: warn.message,
                        info: warn.info
                    }
                });
            });

            program.events.on('view:mark', function(data) {
                send({
                    type: 'data', data: {
                        type: 'mark',
                        time: data.time,
                        view_id: data.channel
                    }
                });
            });

            program.events.on('view:tick', function(data) {
                send({
                    type: 'data', data: {
                        type: 'tick',
                        time: data.time,
                        view_id: data.channel
                    }
                });
            });

            program.events.on('view:eof', function(data) {
                send({
                    type: 'data', data: {
                        type: 'view_end',
                        view_id: data.channel
                    }
                });
            });

            program.events.on('view:points', function(data) {
                send({
                    type: 'data', data: {
                        type: 'points',
                        points: data.points,
                        view_id: data.channel
                    }
                });
            });

            logger.debug('activating program', bundle.program);

            // Start the program.
            running_program = program;
            program.activate();

            return program.done();
        })
        .then(function() {
            logger.debug('program done');
            running_program = null;
            send({
                type: 'done'
            });
        })
        .catch(function(err) {
            // If it's a juttle error, return it with a juttle_error
            // message. Otherwise, return it with an internal_error
            // message.

            if (err instanceof JuttleErrors.JuttleError) {
                process.send({
                    type: 'juttle_error',
                    err: err
                });
            } else {
                process.send({
                    type: 'internal_error',
                    err: {
                        name: err.name,
                        message: err.message,
                        stack: err.stack
                    }
                });
            }

            // Also send a done message so the job manager stops the
            // job
            send({
                type: 'done'
            });
        });
    }
});

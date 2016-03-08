'use strict';

var _ = require('underscore');
var fs = require('fs-extra');
var log4js = require('log4js');

function logSetup(config) {
    config = config || {};
    if (config['log-config']) {
        log4js.configure(config['log-config']);
    } else {
        var levels = {
            '[all]': config['log-level'] || 'info'
        };

        // Handle node.js style debug configuration where DEBUG is a
        // comma-separated list of debug targets, or '*' to enable all
        // debugging.
        var DEBUG = process.env.DEBUG;
        if (DEBUG) {
            var targets = DEBUG.split(',');
            _.each(targets, function(target) {
                if (target === '*') { target = '[all]'; }
                levels[target] = 'debug';
            });
        }
        var log4js_opts = {
            levels: levels
        };

        // If daemonizing and if no output file was specified, use a
        // default.
        if (config.daemonize && ! config.output) {
            config.output = config['log-default-output'];
        }

        if (config.output) {

            fs.ensureFileSync(config.output);
            fs.accessSync(config.output, fs.R_OK | fs.W_OK);

            log4js_opts.appenders = [
                {type: 'file', filename: config.output}
            ];

        } else {
            log4js_opts.appenders = [
                    {type: 'console'}
            ];
        }
        log4js.configure(log4js_opts);
    }
}

module.exports = logSetup;

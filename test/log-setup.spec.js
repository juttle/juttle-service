'use strict';
var expect = require('chai').expect;
var path = require('path');
var fs = require('fs-extra');
var log4js = require('log4js');
var logSetup = require('../lib/log-setup');
var retry = require('bluebird-retry');

let logdir = path.join(__dirname, 'logdir');

function test_file_logger(logfile, component) {
    expect(log4js.appenders).to.have.property('file');

    let logger = log4js.getLogger(component);
    logger.info('Some output');

    return retry(function() {
        var contents = fs.readFileSync(logfile).toString();
        expect(contents).to.contain(`[INFO] ${component} - Some output`);
    }, {interval: 200, max_tries: 50})
    .then(function() {
        // This removes the file logger. Verify that subsequent logs
        // are not logged to the file.
        logSetup();
        let new_logger = log4js.getLogger(component);
        new_logger.info(`Some more output for ${component}`);
    }).delay(2000)
    .then(function() {
        var contents = fs.readFileSync(logfile).toString();
        expect(contents).to.not.contain(`[INFO] ${component} - Some more output`);
    });
}


describe('logSetup() function', function() {

    // Remove any existing sample logfile.
    before(function() {
        fs.removeSync(logdir);
        fs.mkdirSync(logdir);
    });

    after(function() {
        fs.removeSync(logdir);
    });

    beforeEach(function() {
        fs.chmodSync(logdir, '0755');
    });

    it('by default has log level of info and a console logger', function() {
        logSetup();

        expect(log4js.levels.config['[all]']).to.equal('info');
        expect(log4js.appenders).to.not.have.property('file');
    });

    it('can create with direct log4js config', function() {

        let logfile = path.join(logdir, 'direct-config.log');

        logSetup({'log-config': {
            appenders: [
                {
                    type: 'file',
                    filename: logfile
                }
            ]
        }});

        return test_file_logger(logfile, 'direct');
    });

    it('can create with log-level provided as an option', function() {

        logSetup({'log-level': 'error'});

        expect(log4js.levels.config['[all]']).to.equal('error');
    });

    it('can read DEBUG environment variable and map to a list of targets', function() {
        process.env.DEBUG = 'target1,target2';
        logSetup();

        expect(log4js.levels.config.target1).to.equal('debug');
        expect(log4js.levels.config.target2).to.equal('debug');
    });

    it('honors output option', function() {

        let logfile = path.join(logdir, 'output-config.log');

        logSetup({
            'output': logfile
        });

        return test_file_logger(logfile, 'output');
    });

    it('throws an error for a file that exists but can not be read/written', function() {

        let message = undefined;
        let no_perms_file = path.join(logdir, 'cannot-rw.log');
        fs.ensureFileSync(no_perms_file);
        fs.chmodSync(no_perms_file, '0000');

        try {
            logSetup({
                'output': no_perms_file
            });
        } catch (err) {
            message = err.message;
        }
        expect(message).to.contain('permission denied');
    });

    it('throws an error for a file that can not be created', function() {

        let message = undefined;
        let cannot_create_file = path.join(logdir, 'cannot-create.log');

        fs.chmodSync(logdir, '0000');

        try {
            logSetup({
                'output': cannot_create_file
            });
        } catch (err) {
            message = err.message;
        }
        expect(message).to.contain('permission denied');
    });

    it('sets output to log-default-output when daemonizing', function() {

        let logfile = path.join(logdir, 'daemon-config.log');

        logSetup({
            daemonize: true,
            'log-default-output': logfile
        });

        return test_file_logger(logfile, 'daemon');
    });

});

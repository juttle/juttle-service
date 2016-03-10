'use strict';

var _ = require('underscore');
var expect = require('chai').expect;
var chakram = require('chakram');
var ckexpect = chakram.expect;
var Promise = require('bluebird');
var findFreePort = Promise.promisify(require('find-free-port'));

// Test verifying the proper overrides of command-line options,
// juttle-config file, and built-in defaults.
var service = require('..').service;

describe('Juttle Service Configuration', function() {

    let svc = undefined;
    let config_override_path = `${__dirname}/test-configs/override-defaults.json`;

    after(function() {
        if (svc) {
            svc.stop();
        }
    });

    it('Returns built-in defaults', function() {
        let config = service.configure({});
        expect(config).to.deep.equal(service.default_config);
    });

    it('Fully normalizes a path "."', function() {
        let config = service.configure({root: '.'});
        expect(config).to.deep.equal(_.extend({}, service.default_config, {root: process.cwd()}));
    });

    it('is overridden by values in juttle-config.json', function() {
        let config = service.configure({config: config_override_path});
        expect(config).to.deep.equal(_.extend({}, service.default_config, {port: 9183, output: 'my-log.txt'}));
    });

    it('is overridden by values provided directly', function() {
        let config = service.configure({config: config_override_path, port: 9184, 'log-level': 'debug'});
        expect(config).to.deep.equal(_.extend({}, service.default_config, {port: 9184, output: 'my-log.txt', 'log-level': 'debug'}));
    });

    it('can be read via GET /config-info', function() {
        return findFreePort(10000, 20000)
        .then((freePort) => {
            let config = service.configure({config: config_override_path, port: freePort, 'log-level': 'debug'});
            svc = service.run(config);

            let response = chakram.get(`http://localhost:${freePort}/api/v0/config-info`);
            ckexpect(response).to.have.status(200);
            let exp = _.extend({}, service.default_config, {port: freePort, output: 'my-log.txt', 'log-level': 'debug'});
            ckexpect(response).to.have.json(exp);
            return chakram.wait();
        });
    });
});

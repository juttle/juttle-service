'use strict';
var path = require('path');
var expect = require('chai').expect;
var child_process = require('child_process');
var Promise = require('bluebird');
var findFreePort = Promise.promisify(require('find-free-port'));
var service = require('../lib/juttle-service');

let juttle_service_cmd = path.resolve(`${__dirname}/../bin/juttle-service`);
let juttle_service_client_cmd = path.resolve(`${__dirname}/../bin/juttle-service-client`);

describe('juttle-service-client binary unit tests', function() {

    let server;
    let juttle_service;

    before(function() {
        findFreePort(10000, 20000)
        .then((freePort) => {
            server = 'localhost:' + freePort;
            juttle_service = service.run({port: freePort, root_directory: __dirname});
        });
    });

    after(function() {
        juttle_service.stop();
    });

    it('Can execute juttle-service-client binary with --help', function() {
        try {
            child_process.execSync(`${juttle_service_client_cmd} --help`);
        } catch (err) {
            // The status is 1, but we can also check the output for 'usage:'
            expect(err.status).to.equal(1);
            expect(err.stdout.toString()).to.match(/^usage: /);
        }
    });

    it('Can execute juttle-service-client binary with list_jobs', function(done) {

        let got_output = false;

        // Can't use execSync here, as the server is running within
        // our own process, and spawnSync blocks the event loop.
        let child = child_process.exec(`${juttle_service_client_cmd} --juttle-service ${server} list_jobs`);

        child.stdout.on('data', (data) => {
            if (data.toString().match(/\[\]/)) {
                got_output = true;
            }
        });

        child.on('close', (code) => {
            expect(code).to.equal(0);
            expect(got_output).to.equal(true);
            done();
        });
    });

});


describe('juttle-service binary unit tests', function() {

    it('Can execute juttle-service binary with --help', function() {
        try {
            child_process.exec(`${juttle_service_cmd} --help`);
        } catch (err) {
            // The status is 1, but we can also check the output for 'usage:'
            expect(err.status).to.equal(1);
            expect(err.stdout.toString()).to.match(/^usage: /);
        }
    });

    it('Can execute juttle-service binary and see startup line', function(done) {
        findFreePort(10000, 20000)
        .then((freePort) => {
            let child = child_process.exec(`${juttle_service_cmd} --port ${freePort}`);
            child.stdout.on('data', (data) => {
                if (data.toString().match(/Juttle service listening at/)) {
                    child.kill();
                    done();
                }
            });
        });
    });
});

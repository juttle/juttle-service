'use strict';
var expect = require('chai').expect;
var Promise = require('bluebird');
var findFreePort = Promise.promisify(require('find-free-port'));
var JuttleService = require('../lib/juttle-service');
var retry = require('bluebird-retry');

describe('juttle-service-client tests', function() {
    var juttle_service;
    var server;
    var juttleRoot = __dirname + '/juttle-root';

    var current_output;
    var current_errors;
    var exit_status;
    var mycmd_called;
    var myarg_value;
    var ws;

    function save_output(line) {
        current_output = current_output + ' ' + line;
    }

    function save_error(line) {
        current_errors = current_errors + ' ' + line;
    }

    function note_exit(status) {
        exit_status = status;
    }

    function mycmd(opts) {
        mycmd_called = true;
        myarg_value = opts.myval;
    }

    before(function() {
        findFreePort(10000, 20000)
        .then((freePort) => {
            server = 'localhost:' + freePort;
            juttle_service = JuttleService.service.run({port: freePort, root_directory: juttleRoot, delayed_endpoint_close: 2000});
        });
    });

    after(function() {
        juttle_service.stop();
    });

    beforeEach(function() {
        current_output = '';
        current_errors = '';
        exit_status = undefined;
        mycmd_called = false;
        myarg_value = false;

        JuttleService.client.init({
            write_output: save_output,
            write_error: save_error,
            client_exit: note_exit,
            commands: {
                mycmd: {
                    usage: '{myarg}',
                    perform: mycmd
                }
            },
            cmdargs: {
                myarg: {
                    usage: '--myarg <myval>',
                    desc: 'My val'
                }
            }
        });
    });

    afterEach(function() {
        if (ws !== undefined) {
            ws.close();
            ws = undefined;
        }
    });

    it('Can call usage()', function(done) {
        JuttleService.client.usage();
        expect(current_output).to.contain('mycmd');
        expect(current_output).to.contain('--myarg <myval>');
        expect(current_output).to.contain('list_jobs');
        expect(current_output).to.contain('--job <job-id>');
        expect(exit_status).to.equal(1);
        done();
    });

    it('Can call list_jobs for all jobs', function() {
        let opts = {};
        JuttleService.client.command(server, opts, 'list_jobs');
        return retry(function() {
            expect(current_output).to.contain('[]');
            expect(exit_status).to.equal(undefined);
        }, {interval: 100, max_tries: 10});
    });

    it('Can call list_observers for all observers', function() {
        let opts = {};
        JuttleService.client.command(server, opts, 'list_observers');
        return retry(function() {
            expect(current_output).to.contain('[]');
            expect(exit_status).to.equal(undefined);
        }, {interval: 100, max_tries: 10});
    });

    it('Can call subscribe for an observer id', function() {
        let opts = {observer: 'myobserver'};
        ws = JuttleService.client.command(server, opts, 'subscribe');
        return retry(function() {
            expect(current_output).to.contain('Subscribing to all jobs associated with observer');
            expect(exit_status).to.equal(undefined);
        }, {interval: 100, max_tries: 10});
    });

    it('Can call subscribe for a job id', function() {
        let opts = {job: 'myjob'};
        JuttleService.client.command(server, opts, 'subscribe');
        return retry(function() {
            expect(current_output).to.contain('Web socket connection closed, exiting');
            expect(exit_status).to.equal(0);
        }, {interval: 100, max_tries: 10});
    });

    it('Can delete a job', function() {
        let opts = {job: 'myjob'};
        JuttleService.client.command(server, opts, 'delete');
        return retry(function() {
            expect(current_errors).to.contain('No such job: myjob');
            expect(exit_status).to.equal(undefined);
        }, {interval: 100, max_tries: 10});
    });

    it('Can run a job', function() {
        let opts = {path: 'simple.juttle'};
        JuttleService.client.command(server, opts, 'run');
        return retry(function() {
            expect(current_output).to.contain('Started job: {"job_id":');
            expect(exit_status).to.equal(undefined);
        }, {interval: 100, max_tries: 10});
    });

    it('Can get_inputs', function() {
        let opts = {path: 'inputs.juttle', input: 'inval=my'};
        JuttleService.client.command(server, opts, 'get_inputs');
        return retry(function() {
            expect(current_output).to.contain('"value": "my"');
            expect(exit_status).to.equal(undefined);
        }, {interval: 100, max_tries: 10});
    });

    it('Can call custom provided command', function() {
        let opts = {myval: 'foo'};
        JuttleService.client.command(server, opts, 'mycmd');
        return retry(function() {
            expect(mycmd_called).to.equal(true);
            expect(myarg_value).to.equal('foo');
            expect(exit_status).to.equal(undefined);
        }, {interval: 100, max_tries: 10});
    });

    it('Get Usage for unrecognized command', function() {
        JuttleService.client.command(server, {}, 'nocmd');
        return retry(function() {
            expect(current_output).to.contain('usage: ');
            expect(exit_status).to.equal(1);
        }, {interval: 100, max_tries: 10});
    });


});

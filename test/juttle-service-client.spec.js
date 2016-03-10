'use strict';
var expect = require('chai').expect;
var Promise = require('bluebird');
var findFreePort = Promise.promisify(require('find-free-port'));
var service = require('..').service;
var client = require('..').client;
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
            juttle_service = service.run({port: freePort, root: juttleRoot, delayed_endpoint_close: 2000});
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

        client.init({
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
        client.usage();
        expect(current_output).to.contain('mycmd');
        expect(current_output).to.contain('--myarg <myval>');
        expect(current_output).to.contain('list_jobs');
        expect(current_output).to.contain('--job <job-id>');
        expect(exit_status).to.equal(1);
        done();
    });

    const RETRY_INTERVAL = 200;
    const MAX_RETRIES = 50;

    it('Can call list_jobs for all jobs', function() {
        let opts = {};
        client.command(server, opts, 'list_jobs');
        return retry(function() {
            expect(current_output).to.contain('[]');
            expect(exit_status).to.equal(undefined);
        }, {interval: RETRY_INTERVAL, max_tries: MAX_RETRIES});
    });

    it('Can call list_observers for all observers', function() {
        let opts = {};
        client.command(server, opts, 'list_observers');
        return retry(function() {
            expect(current_output).to.contain('[]');
            expect(exit_status).to.equal(undefined);
        }, {interval: RETRY_INTERVAL, max_tries: MAX_RETRIES});
    });

    it('Can call subscribe for an observer id', function() {
        let opts = {observer: 'myobserver'};
        ws = client.command(server, opts, 'subscribe');
        return retry(function() {
            expect(current_output).to.contain('Subscribing to all jobs associated with observer');
            expect(exit_status).to.equal(undefined);
        }, {interval: RETRY_INTERVAL, max_tries: MAX_RETRIES});
    });

    it('Can call subscribe for a job id', function() {
        let opts = {job: 'myjob'};
        client.command(server, opts, 'subscribe');
        return retry(function() {
            expect(current_output).to.contain('Web socket connection closed, exiting');
            expect(exit_status).to.equal(0);
        }, {interval: RETRY_INTERVAL, max_tries: MAX_RETRIES});
    });

    it('Can delete a job', function() {
        let opts = {job: 'myjob'};
        client.command(server, opts, 'delete');
        return retry(function() {
            expect(current_errors).to.contain('No such job: myjob');
            expect(exit_status).to.equal(undefined);
        }, {interval: RETRY_INTERVAL, max_tries: MAX_RETRIES});
    });

    it('Can run a job', function() {
        let opts = {path: 'simple.juttle'};
        client.command(server, opts, 'run');
        return retry(function() {
            expect(current_output).to.contain('Started job: {"job_id":');
            expect(exit_status).to.equal(undefined);
        }, {interval: RETRY_INTERVAL, max_tries: MAX_RETRIES});
    });

    it('Can run a job with --wait', function() {
        let opts = {path: 'simple.juttle', 'wait': true};
        client.command(server, opts, 'run');
        return retry(function() {
            expect(current_output).to.contain('Starting program and waiting for it to finish');
            expect(exit_status).to.equal(undefined);
        }, {interval: RETRY_INTERVAL, max_tries: MAX_RETRIES});
    });

    it('Can run a job with syntax errors and get errors back', function() {
        let opts = {path: 'has-syntax-error.juttle'};
        client.command(server, opts, 'run');
        return retry(function() {
            expect(current_errors).to.contain('SYNTAX-ERROR-WITH-EXPECTED');
            expect(exit_status).to.equal(undefined);
        }, {interval: RETRY_INTERVAL, max_tries: MAX_RETRIES});
    });

    it('Can get_inputs', function() {
        let opts = {path: 'inputs.juttle', input: 'inval=my'};
        client.command(server, opts, 'get_inputs');
        return retry(function() {
            expect(current_output).to.contain('"value": "my"');
            expect(exit_status).to.equal(undefined);
        }, {interval: RETRY_INTERVAL, max_tries: MAX_RETRIES});
    });

    it('Can get_inputs with errors', function() {
        let opts = {path: 'inputs.juttle', input: 'inval'};
        client.command(server, opts, 'get_inputs');
        return retry(function() {
            expect(current_errors).to.contain('invalid input inval');
            expect(exit_status).to.equal(1);
        }, {interval: RETRY_INTERVAL, max_tries: MAX_RETRIES});
    });

    it('Can call custom provided command', function() {
        let opts = {myval: 'foo'};
        client.command(server, opts, 'mycmd');
        return retry(function() {
            expect(mycmd_called).to.equal(true);
            expect(myarg_value).to.equal('foo');
            expect(exit_status).to.equal(undefined);
        }, {interval: RETRY_INTERVAL, max_tries: MAX_RETRIES});
    });

    it('Get Usage for unrecognized command', function() {
        client.command(server, {}, 'nocmd');
        return retry(function() {
            expect(current_output).to.contain('usage: ');
            expect(exit_status).to.equal(1);
        }, {interval: RETRY_INTERVAL, max_tries: MAX_RETRIES});
    });


});

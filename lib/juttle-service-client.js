'use strict';

var _ = require('underscore');
var WebSocket = require('ws');
var rp = require('request-promise');
var cli_errors = require('juttle/lib/cli/errors');
var rp_errors = require('request-promise/errors');
var sprintf = require('sprintf-js').sprintf;

/*eslint-disable no-console */
let write_output = console.log;
let write_error = console.error;
/*eslint-enable no-console */

let client_exit = process.exit;

function list_jobs(opts) {
    let job_id = opts.job || '';

    rp(opts.http_url + '/jobs/' + job_id)
        .then(function(body) {
            write_output(JSON.stringify(JSON.parse(body), null, 2));
        }).error(function(e) {
            write_error(sprintf('ERROR %s', e.message));
        });
}


function list_observers(opts) {
    rp(opts.http_url + '/observers/')
        .then(function(body) {
            write_output(JSON.stringify(JSON.parse(body), null, 2));
        }).error(function(e) {
            write_error(sprintf('ERROR %s', e.message));
        });
}

function subscribe(opts) {
    let ws;

    if (opts.observer !== undefined) {
        write_output(sprintf('Subscribing to all jobs associated with observer: %s', opts.observer));
        ws = new WebSocket(opts.ws_url + '/observers/' + opts.observer);
        ws.on('message', function(message) {
            write_output(sprintf('received: %s', message));
            let msg = JSON.parse(message);
            if (msg.type === 'ping') {
                ws.send(JSON.stringify({type: 'pong'}));
            }
        });
        ws.on('close', function(message) {
            write_output('Web socket connection closed, exiting');
            client_exit(0);
        });
    } else if (opts.job !== undefined) {
        write_output(sprintf('Subscribing to job: %s', opts.job));
        ws = new WebSocket(opts.ws_url + '/jobs/' + opts.job);
        ws.on('message', function(message) {
            write_output(sprintf('received: %s', message));
            let msg = JSON.parse(message);
            if (msg.type === 'ping') {
                ws.send(JSON.stringify({type: 'pong'}));
            }
        });

        ws.on('close', function(message) {
            write_output('Web socket connection closed, exiting');
            client_exit(0);
        });
    } else {
        usage();
    }

    return ws;
}

function delete_job(opts) {
    if (opts.job !== undefined) {
        rp({method: 'DELETE', uri: opts.http_url + '/jobs/' + opts.job})
            .then(function(body) {
                write_output(JSON.stringify(JSON.parse(body), null, 2));
            }).error(function(e) {
                write_error(sprintf('ERROR %s', e.message));
            });
    } else {
        usage();
    }
}

function run(opts) {
    if (opts.path !== undefined) {

        let runInputs = read_inputs(opts);

        rp(opts.http_url + '/paths/' + opts.path)
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
                    uri: opts.http_url + '/jobs',
                    headers: {
                        'Content-type': 'application/json'
                    },
                    body: JSON.stringify(body)
                };

                if (opts.wait) {
                    write_output('Starting program and waiting for it to finish...');
                }
                return rp(post_opts)
                    .then(function(body) {
                        if (opts.wait) {
                            write_output('Job output:\n' + JSON.stringify(JSON.parse(body), null, 2));
                        } else {
                            write_output(sprintf('Started job: %s', body));
                        }
                    });
            }).catch(rp_errors.RequestError, function (e) {
                write_error(sprintf('ERROR %s', e.message));
            }).error(function(e) {
                handle_error(e, opts.path);
            });
    } else {
        usage();
    }
}

function get_inputs(opts) {
    let getInputs = read_inputs(opts);

    rp(opts.http_url + '/paths/' + opts.path)
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
                uri: opts.http_url + '/prepare',
                headers: {
                    'Content-type': 'application/json'
                },
                body: JSON.stringify(body)
            };
            return rp(post_opts)
                .then(function(body) {
                    write_output(JSON.stringify(JSON.parse(body), null, 2));
                });
        }).catch(rp_errors.RequestError, function (e) {
            write_error(sprintf('ERROR %s', e.message));
        }).error(function(e) {
            handle_error(e, opts.path);
        });
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
        write_error(sprintf('ERROR %s', err.message));
        return;
    }

    // If it's a juttle error containing a program
    // location, print the error in context.
    if (err_obj.code === 'JS-JUTTLE-ERROR') {
        write_error(cli_errors.show_in_context({err: err_obj.info.err,
                                                  program: err_obj.info.bundle.program,
                                                  modules: err_obj.info.bundle.modules,
                                                  filename: filename}));
    } else {
        write_error(sprintf('ERROR %s', err.message));
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
                write_error(sprintf('error: invalid input %s', x));
                usage();
            }
            let num = +L[1];
            inputs[L[0]] = isNaN(num) ? L[1] : num;
        });
    }

    return inputs;
}

let cmdargs = {
    'path': {
        usage: '--path <path-to-juttle-file>',
        desc: 'Path to file relative to configured root directory.'
    },
    'wait': {
        usage: '--wait',
        desc: 'If true, wait for program to finish, otherwise run in background'
    },
    'input': {
        usage: '--input name=val',
        desc: 'One or more input values.'
    },
    'job': {
        usage: '--job <job-id>',
        desc: 'Job id.'
    },
    'observer': {
        usage: '--observer <observer-id>',
        desc: 'Observer id.'
    },
    'server': {
        usage: '--juttle-service <hostname:port>',
        desc: 'Hostname/port of server'
    },
    help: {
        usage: '--help',
        desc: 'Print this help and exit'
    }
};

let commands = {
    subscribe: {
        usage: '({job} | {observer})',
        perform: subscribe
    },
    list_jobs: {
        usage: '[{job}]',
        perform: list_jobs
    },
    list_observers: {
        usage: '',
        perform: list_observers
    },
    run: {
        usage: '{path} [{wait}] [{observer}]',
        perform: run
    },
    delete: {
        usage: '{job}',
        perform: delete_job
    },
    get_inputs: {
        usage: '{path} {input} [{input} ...]',
        perform: get_inputs
    }
};

function expand(string) {
    return string.replace(/\{([^}]*)\}/g, function(match, key) {
        return cmdargs[key].usage;
    });
}

function init(options) {
    write_output = options.write_output;
    write_error = options.write_error;
    client_exit = options.client_exit;
    commands = _.extend(commands, options.commands);
    cmdargs = _.extend(cmdargs, options.cmdargs);
}

function usage() {

    // Given the command descriptions, create the list of commands
    // used by each option.
    _.each(cmdargs, function (arginfo, arg) {
        arginfo.commands = [];
        _.each(commands, function(info, cmd) {
            if (info.usage.indexOf('{' + arg + '}') > -1) {
                arginfo.commands.push(cmd);
            }
        });
    });

    // Expand each command usage
    _.each(commands, function (info, cmd) {
        info.usage = expand(info.usage);
    });

    write_output(sprintf('usage: [%s] [--help] [COMMAND] [OPTIONS]', cmdargs['server'].usage));
    write_output(sprintf('%5s[COMMAND]: one of the following, with the following options:', ''));
    _.each(commands, function (info, cmd) {
        write_output(sprintf('%10s%s %s', '', cmd, info.usage));
    });
    write_output(sprintf('%5s[OPTIONS]: one of the following:', ''));
    _.each(cmdargs, function (info, arg) {
        write_output(sprintf('%10s%-45s%s','', info.usage, info.desc));
        if (info.commands.length > 0) {
            write_output(sprintf('%10s%-45sused by: %s', '', '', info.commands.join(',')));
        }
    });
    client_exit(1);
}

function command(server, opts, command) {

    let API_PREFIX = '/api/v0';

    let cmd_opts = _.extend({}, opts, {
        http_url: 'http://' + server + API_PREFIX,
        ws_url: 'ws://' + server + API_PREFIX
    });

    if (! _.has(commands, command)) {
        usage();
    } else {
        return commands[command].perform(cmd_opts);
    }
}

module.exports = {
    init: init,
    usage: usage,
    command: command
};


# juttle-service

[![Build Status](https://travis-ci.org/juttle/juttle-service.svg?branch=master)](https://travis-ci.org/juttle/juttle-service)

juttle-service is an API-based execution engine for juttle programs.

It exposes an [API](./docs/jobs-api.md) for executing and managing a set of running juttle jobs. Each job executes in a separate node.js subprocess and either returns the results immediately or creates a websocket over which results are streamed using the [JSDP protocol](./docs/jsdp-api.md).

## Getting Started

### Installation

Make sure you have [node](http://nodejs.org) (with [npm](http://npmjs.org)) installed.

Use npm to install juttle and juttle-service:
```
$ npm install juttle
$ npm install juttle-service
```

We've tested with nodejs 4.2.3 and npm 2.14.17. Other combinations of nodejs and npm likely work, but we haven't tested all combinations.

## Ecosystem

Here's how the juttle-service module fits into the overall [Juttle Ecosystem](https://github.com/juttle/juttle/blob/master/docs/juttle_ecosystem.md):

[![Juttle Ecosystem](https://github.com/juttle/juttle/raw/master/docs/images/JuttleEcosystemDiagram.png)](https://github.com/juttle/juttle/blob/master/docs/juttle_ecosystem.md)

## Options and Configuration

Here are the full command line options supported by the daemon:

### juttle-service

```
usage: [--port <port>] [--root <path>]
       [--config <juttle-config-path>] [--daemonize]
       [--output <logfile>] [--log-config <log4js-config-path>]
       [--log-level <level] [--help]
       -p, --port <port>:                     Run juttle-service on the specified port
       -r, --root <path>:                     Use <path> as the root directory for juttle programs
       -c, --config <juttle-config-path>:     Read juttle config from <juttle-config-path>
       -d, --daemonize:                       Daemonize juttle-service and log to configured log file
       -o, --output <logfile>:                Log to specififed file when daemonized
       -L, --log-config <log4js-config-path>: Configure logging from <log4js-config-path>. Overrides any value of -o
       -l, --log-level <level>:               Use a default log level of <level>. Overridden by any log level specified in -L
       -h, --help:                            Print this help and exit
```

``juttle-service`` uses log4js for logging and by default logs to the console when in the foreground, ``/var/log/juttle-service.log`` when in the background.

### Juttle config file

The Juttle compiler and runtime within juttle-service are also configured via the juttle configuration file, typically at ``$(HOME)/.juttle/config.json``. For more information on the juttle configuration file, see the [juttle configuration documentation](https://github.com/juttle/juttle/blob/master/docs/reference/cli.md#configuration).

The Juttle Service configuration options (default values shown):

```javascript
// config.json
{
    "juttle-service": {
        // Whether HTTP responses should be compressed when
        // the client supports it.
        "compress_response": true,

        // Time (in ms) a finished job should wait for the first websocket
        // to connect before disposing of the results.
        "delayed_job_cleanup": 10000,

        // The number messages job should buffer for sending to
        // websockets that join after the job has started.
        "max_saved_messages": 1024,

        // After a job has finished, wait this many ms before closing the
        // websocket connection associated with the job.
        "delayed_endpoint_close": 10000
    },
    "adapters": { ... }
}
```

In addition, all command-line arguments other than `--config` can also be specified in ``juttle/config.json`` via their long arguments. When specified, command line arguments override any values found in the configuration file.

### Module resolution

When juttle-service resolves module references in juttle programs while creating program bundles, it searches the following locations:
* The configured root directory.
* The same location as the current juttle program. For example, if a program is at ``/home/user/program.juttle`` and refers to a module ``module.juttle``, juttle-service looks in ``/home/user`` for ``module.juttle``.
* Any locations in the environment variable JUTTLE_MODULE_PATH (colon-separated list of directories).

## Testing

To run unit tests:

``npm test``

Both are run automatically by Travis.

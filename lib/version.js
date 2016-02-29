'use strict';

let _ = require('underscore');
let JuttleAdapters = require('juttle/lib/runtime/adapters');
let juttleVersion = require('juttle/package.json').version;
let juttleServiceVersion = require('../package.json').version;
let juttleJSDPVersion = require('juttle-jsdp/package.json').version;

const BUILT_IN_ADAPTERS = ['file', 'http', 'http_server', 'stdio', 'stochastic'];

let addedComponents = {};

function getVersionInfo() {
    let adapters = {};

    // Filtering out builtin adapters based on the hard-coded list above
    // and dynamically building the adapter module name are both
    // temporary hacks until https://github.com/juttle/juttle/pull/472
    // is released.
    JuttleAdapters.list().filter((info) => {
        return !_.contains(BUILT_IN_ADAPTERS, info.adapter);
    }).forEach((info) => {
        adapters[`juttle-${info.adapter}-adapter`] = info.version;
    });

    return _.extend({
        'juttle-service': juttleServiceVersion,
        'juttle': juttleVersion,
        'juttle-jsdp': juttleJSDPVersion
    }, adapters, addedComponents);
}

module.exports = {
    addComponent(name, version) {
        addedComponents[name] = version;
    },
    getVersionInfo: getVersionInfo
};

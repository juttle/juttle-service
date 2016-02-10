'use strict';

// This file defines error classes related to the JuttleService's REST api.

var messages = require('./strings/juttle-service-error-strings-en-US').error;
var _ = require('underscore');

// Similar to version in juttle/lib/errors.js.
function messageForCode(code, info) {
    var template = _.template(messages[code], {
        interpolate: /\{\{([^}]*)\}\}/g,
        variable: 'info'
    });

    return template(info);
}


class BaseError extends Error {
    constructor(name, code, status, info) {
        super();

        this.message = messageForCode(code, info);
        Error.call(this, this.message);

        // not present on IE
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }

        this.code = code;
        this.status = status;
        this.info = info;
    }
}

var errors = {};

// An error that can not be identified. Ideally, this error should
// never be thrown. It is only used as a catchall in cases where a
// more specific error can not be found.
class UnknownError extends BaseError {
    constructor(info) {
        super('UnknownError', 'JS-UNKNOWN-ERROR', 500, info);
    }
}


// All var from the juttle compiler and runtime are grouped as this
// error. The info.err field contains the complete error object from
// the Juttle compiler or runtime, and the info.bundle field should
// contain a program bundle containing the program and modules that
// resulted in the error.

class JuttleError extends BaseError {
    constructor(info) {
        super('JuttleError', 'JS-JUTTLE-ERROR', 400, info);
    }
}

class BundleError extends BaseError {
    constructor(info) {
        super('BundleError', 'JS-BUNDLE-ERROR', 400, info);
    }
}

class JobNotFoundError extends BaseError {
    constructor(info) {
        super('JobNotFoundError', 'JS-JOB-NOT-FOUND-ERROR', 404, info);
    }
}

class FileNotFoundError extends BaseError {
    constructor(info) {
        super('FileNotFoundError', 'JS-FILE-NOT-FOUND-ERROR', 404, info);
    }
}

class FileAccessError extends BaseError {
    constructor(info) {
        super('FileAccessError', 'JS-FILE-ACCESS-ERROR', 403, info);
    }
}

class DirectoryNotFoundError extends BaseError {
    constructor(info) {
        super('DirectoryNotFoundError', 'JS-DIR-NOT-FOUND-ERROR', 404, info);
    }
}

class DirectoryAccessError extends BaseError {
    constructor(info) {
        super('DirectoryAccessError', 'JS-DIR-ACCESS-ERROR', 403, info);
    }
}

class InvalidPathError extends BaseError {
    constructor(info) {
        super('InvalidPathError', 'JS-INVALID-PATH-ERROR', 400, info);
    }
}

class TimeoutError extends BaseError {
    constructor(info) {
        super('TimeoutError', 'JS-TIMEOUT-ERROR', 408, info);
    }
}

errors.unknownError = function(err) {
    return new UnknownError({err: err});
};

errors.juttleError = function(err, bundle) {
    return new JuttleError({err: err, bundle: bundle});
};

errors.bundleError = function(reason, bundle) {
    return new BundleError({reason: reason, bundle: bundle});
};

errors.jobNotFoundError = function(job_id) {
    return new JobNotFoundError({job_id: job_id});
};

errors.fileNotFoundError = function(path) {
    return new FileNotFoundError({path: path});
};

errors.fileAccessError = function(path) {
    return new FileAccessError({path: path});
};

errors.directoryNotFoundError = function(path) {
    return new DirectoryNotFoundError({path: path});
};

errors.directoryAccessError = function(path) {
    return new DirectoryAccessError({path: path});
};

errors.invalidPathError = function(path) {
    return new InvalidPathError({path: path});
};

errors.timeoutError = function(timeout) {
    return new TimeoutError({timeout: timeout});
};

errors.is_juttle_service_error = function(err) {
    return (err instanceof UnknownError ||
            err instanceof JuttleError ||
            err instanceof BundleError ||
            err instanceof JobNotFoundError ||
            err instanceof FileNotFoundError ||
            err instanceof FileAccessError ||
            err instanceof DirectoryNotFoundError ||
            err instanceof DirectoryAccessError ||
            err instanceof InvalidPathError ||
            err instanceof TimeoutError);
};

module.exports = errors;

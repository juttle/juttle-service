'use strict';

var _ = require('underscore');
var logger = require('log4js').getLogger('juttle-job');
var JuttleJob = require('./juttle-job');

class ImmediateJuttleJob extends JuttleJob {
    constructor(options) {
        super(options);
        var self = this;

        self._timeout = options.timeout || 60000;

        // The output of this program, as a hash view_id -> view
        // description + array of points.
        self._program_output = {};

        // Any errors for this program.
        self._errors = [];

        // Any warnings for this program.
        self._warnings = [];
    }

    _on_job_msg(msg) {
        var self = this;

        // Remove the job_id from the message, it isn't necessary.
        msg = _.omit(msg, 'job_id');

        // If this is a job_start or job_end message, save it
        // separately.
        if (msg.type === 'job_start') {
            // Initialize _program_output from the view descriptions.
            msg.views.forEach(function(desc) {
                self._program_output[desc.view_id] = {
                    options: desc.options,
                    type: desc.type,
                    data: []
                };
            });
        } else if (msg.type === 'job_end') {
            // We actually wait until close() to return the data.
        } else if (msg.type === 'error') {
            self._errors.push(msg.error);
        } else if (msg.type === 'warning') {
            self._warnings.push(msg.warning);
        } else if (msg.type === 'mark') {
            var data = _.omit(msg, 'view_id');
            // Append the data to the appropriate view's array of data.
            self._program_output[msg.view_id].data.push(data);
        } else if (msg.type === 'points') {
            var currentData = self._program_output[msg.view_id].data;
            var lastData = _.last(currentData);
            // If the most recently buffered data is not a points entry, create one.
            // Otherwise, concat the new points into the last entry.
            if (_.isEmpty(currentData) || lastData.type !== 'points') {
                currentData.push({
                    type: 'points',
                    points: msg.points
                });
            }
            else {
                lastData.points = lastData.points.concat(msg.points);
            }
        }
    }

    start() {
        var self = this;

        // Call JuttleJob's start() method, which starts the
        // program. Then wait for the program to finish and return the
        // program's output.

        return JuttleJob.prototype.start.call(this)
        .then(function() {
            return self.waitfor();
        }).then(function() {
            return {
                output: self._program_output,
                errors: self._errors,
                warnings: self._warnings
            };
        });
    }

    waitfor() {
        var self = this;

        // Create a promise that resolves when we receive an 'end'. It
        // has a timeout that rejects if we don't receive the 'end'
        // within timeout ms.
        return new Promise(function(resolve, reject) {
            self.events.on('end', function() {
                logger.debug('Program exited, finishing waitfor()');
                resolve();
            });
        }).timeout(self._timeout, self._job_id + ' timed out');
    }
}

module.exports = ImmediateJuttleJob;

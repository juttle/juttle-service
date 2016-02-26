'use strict';
let path = require('path');
let expect = require('chai').expect;
let child_process = require('child_process');

let juttle_cmd = path.resolve(`${__dirname}/../bin/juttle`);

describe('juttle bin', () => {
    it('can run simple juttle', (done) => {
        let child = child_process.spawn(juttle_cmd, ['-e', 'emit -limit 1 -from :0: | view text -format "json"']);

        let output = '';
        child.stdout.on('data', (data) => {
            output += data;
        });

        child.on('close', (code) => {
            expect(code).to.equal(0);
            expect(JSON.parse(output)).to.deep.equal([{ time: '1970-01-01T00:00:00.000Z' }]);
            done();
        });
    });
});

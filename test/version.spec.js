'use strict';

let _ = require('underscore');
let sinon = require('sinon');
let expect = require('chai').expect;
let JuttleAdapters = require('juttle/lib/runtime/adapters');
let version = require('../lib/version');

function verifyVersionInfo(versionInfo) {
    let VERSION_REGEX = /[0-9]+\.[0-9]+\.[0-9]+/;

    expect(versionInfo['juttle-elastic-adapter']).to.equal('0.4.0');
    expect(versionInfo['juttle']).to.match(VERSION_REGEX);
    expect(versionInfo['juttle-service']).to.match(VERSION_REGEX);
    expect(versionInfo['juttle-jsdp']).to.match(VERSION_REGEX);
    // built in adapters (file in this case) should not be listed
    expect(versionInfo).to.have.keys([
        'juttle-elastic-adapter',
        'juttle',
        'juttle-service',
        'juttle-jsdp'
    ]);
}

describe('version', function() {
    let adapterListStub;

    before(() => {
        adapterListStub = sinon.stub(JuttleAdapters, 'list');

        adapterListStub.returns([
            {
                adapter: 'elastic',
                version: '0.4.0'
            },
            {
                adapter: 'file',
                version: '0.5.1'
            }
        ]);
    });

    after(() => {
        adapterListStub.restore();
    });

    it('returns the correct components with versions', () => {
        verifyVersionInfo(version.getVersionInfo());
    });

    it('returns added components', () => {
        version.addComponent('juttle-engine', '0.5.0');
        let versionInfo = version.getVersionInfo();

        expect(versionInfo['juttle-engine']).to.equal('0.5.0');
        verifyVersionInfo(_.omit(versionInfo, 'juttle-engine'));
    });
});

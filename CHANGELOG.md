# Change Log
This file documents all notable changes to juttle-service. The release numbering uses [semantic versioning](http://semver.org).

## 0.2.0 (Unreleased)

### Major Changes
NOTICE: This release includes breaking changes to the configuration file and wire format.

- Refactored the service module to be more easily embeddable as part of another express project. [#13](https://github.com/juttle/juttle-service/pull/13)
- Removed references to "juttled" in code and the configuration file, replacing with "juttle-service". [#15](https://github.com/juttle/juttle-service/pull)
- Changed the output format when running jobs with wait=true to be less verbose. [#14](https://github.com/juttle/juttle-service/pull/14)

### Minor Changes
- Added support for setting debug logging targets using the DEBUG environment variable [#23](https://github.com/juttle/juttle-service/issues/23)
- Refactored the client script to be more modular and extendable as part of another project. [#22](https://github.com/juttle/juttle-service/pull/22)
- Added compression middleware to improve the wire efficiency. [#12](https://github.com/juttle/juttle-service/pull/12)

### Bug Fixes
- Improved error handling to send more useful information to the client. [#20](https://github.com/juttle/juttle-service/pull/20)
- Fixed a bug in the directory listing that would fail if a dangling symlink was present. [#24](https://github.com/juttle/juttle-service/issues/24)

## 0.1.0
Released 2016-02-05

### Major Changes
- Initial release of the standalone juttle-service, supporting juttle 0.4.x.

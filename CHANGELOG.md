# Change Log
This file documents all notable changes to juttle-service. The release numbering uses [semantic versioning](http://semver.org).

## 0.2.0
Released 2016-02-08

### Major Changes
WARNING: This release includes breaking changes to the configuration file and wire format.

- Removed references to "juttled" in code and the configuration file, replacing with "juttle-service". [#15](https://github.com/juttle/juttle-service/pull)
- Changed the output format when running jobs with wait=true to be less verbose. [#14](https://github.com/juttle/juttle-service/pull/14)
- Refactored the service module to be more easily embeddable as part of another express project. [#13](https://github.com/juttle/juttle-service/pull/13)
- Added compression middleware to improve the wire efficiency. [#12](https://github.com/juttle/juttle-service/pull/12)

## 0.1.0
Released 2016-02-05

### Major Changes
- Initial release of the standalone juttle-service, supporting juttle 0.4.x.

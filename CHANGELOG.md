# Change Log
This file documents all notable changes to juttle-service. The release numbering uses [semantic versioning](http://semver.org).

## 0.4.0
Released 2016-03-10

### Minor Changes
- Add a new /config-info endpoint that returns the configuration of the juttle-service module [[#67](https://github.com/juttle/juttle-service/pull/67)]
- Update to juttle version 0.6.0. [[#69](https://github.com/juttle/juttle-service/pull/69)]
- The default root path for juttle program files is now the current working directory [[#67](https://github.com/juttle/juttle-service/pull/67)]
- Don't specify a default view when compiling programs [[#64](https://github.com/juttle/juttle-service/pull/64)]
- Log messages returned as a part of program output now contain timestamps [[#65](https://github.com/juttle/juttle-service/pull/65)]
- Minor changes to README to aid in understanding the overall ecosystem [[#66](https://github.com/juttle/juttle-service/pull/66)]


## 0.3.0
Release 2016-02-29

### Major changes
NOTICE: This release includes breaking changes to the wire format.
- Update to reflect changes in Juttle 0.5.0. [[#54]](https://github.com/juttle/juttle-service/pull/54)
- Convert all extendable-base classes to ES6 classes [[#41]](https://github.com/juttle/juttle-service/pull/41)
- Update all remaining references to 'sink' in JSDP messages to 'view'. *This changes the JSDP wire format*. [[#37]](https://github.com/juttle/juttle-service/issues/37)

### Minor changes
- Add a `/version` endpoint that returns version information on the juttle and adapter modules in use [[#56]](https://github.com/juttle/juttle-service/pull/56) [[#62]](https://github.com/juttle/juttle-service/pull/62)
- Add additional test coverage for log initialization and configuration [[#40]](https://github.com/juttle/juttle-service/pull/40)
- Add stricter lint checks [[#35]](https://github.com/juttle/juttle-service/pull/35)
- Add additional test coverage for executing binary programs like `bin/juttle-service`, `bin/juttle-service-client` [[#43]](https://github.com/juttle/juttle-service/pull/43)
- Update tests/job manager to reflect additional serialization for log messages from juttle subprocess [[#46]](https://github.com/juttle/juttle-service/pull/46) [[#48]](https://github.com/juttle/juttle-service/pull/48)
- When starting a program via `POST /api/v0/jobs`, you can now provide a `debug: true` property to enable debug logging. The debug logs will be sent over the websocket/available in the immediate repsonse. [[#42]](https://github.com/juttle/juttle-service/issues/42)
- Add a `bin/juttle` wrapper script to execute the juttle cli program from the juttle module [[#55]](https://github.com/juttle/juttle-service/pull/55)

### Bug fixes
- Prevent empty messages from being sent over the JSDP websocket connection [[#17]](https://github.com/juttle/juttle-service/issues/17)

## 0.2.1
Released 2016-02-11

### Bug Fixes
- delayed_endpoint_close: honor when websocket connects before job finishes. [[#38]](https://github.com/juttle/juttle-service/pull/38)
- jobs-api doc: fix example to use view0 instead of sink0 [[#36]](https://github.com/juttle/juttle-service/issues/36)

## 0.2.0
Released 2016-02-10

### Major Changes
NOTICE: This release includes breaking changes to the configuration file and wire format.

- Refactored the service module to be more easily embeddable as part of another express project. [[#13](https://github.com/juttle/juttle-service/pull/13), [#28](https://github.com/juttle/juttle-service/pull/28),
[#32](https://github.com/juttle/juttle-service/pull/32)]
- Removed the watch, push, and browser commands from the client since they will be implemented in juttle-engine. [[#30](https://github.com/juttle/juttle-service/pull/30),
[#22](https://github.com/juttle/juttle-service/pull/22)]
- Removed references to "juttled" in code and the configuration file, replacing with "juttle-service". [[#15]](https://github.com/juttle/juttle-service/pull/15)
- Changed the output format when running jobs with wait=true to be less verbose. [[#14]](https://github.com/juttle/juttle-service/pull/14)

### Minor Changes
- Added CORS headers. [[#29]](https://github.com/juttle/juttle-service/pull/29)
- Exposed the getLogger function from log4js to enable an embedding application to share the same instance. [[#34]](https://github.com/juttle/juttle-service/pull/34)
- Added support for setting debug logging targets using the DEBUG environment variable [[#23]](https://github.com/juttle/juttle-service/issues/23)
- Refactored the client script to be more modular and extendable as part of another project. [[#22]](https://github.com/juttle/juttle-service/pull/22)
- Added compression middleware to improve the wire efficiency. [[#12]](https://github.com/juttle/juttle-service/pull/12)

### Bug Fixes
- Improved error handling to send more useful information to the client. [[#20]](https://github.com/juttle/juttle-service/pull/20)
- Fixed a bug in the directory listing that would fail if a dangling symlink was present. [[#24]](https://github.com/juttle/juttle-service/issues/24)

## 0.1.0
Released 2016-02-05

### Major Changes
- Initial release of the standalone juttle-service, supporting juttle 0.4.x.

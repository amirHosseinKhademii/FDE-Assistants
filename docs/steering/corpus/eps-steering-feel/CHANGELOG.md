
# Changelog

All notable changes to this repository. Keep a Changelog format, roughly.

> Maintenance of this file stopped in 2023 when the team moved to release notes
> generated from the tracker. It is kept because the entries before that are the
> only readable account of why the early design decisions were made. **For
> anything after 2023-05, use `git-log.txt` or `releases/`.**

## [4.2.0] - 2023-05-11
### Changed
- Damping gain break point is now per-programme calibratable (`DAMP_SPD_BRK`).

## [4.1.0] - 2022-11-03
### Fixed
- Rate limiter could overflow on a 1 ms tick at high rack velocity. Found on HIL.

## [4.0.0] - 2021-10-20
### Changed
- Components re-classified following VST-SA-2021-014. **This changed the ASIL.**

## [3.4.0] - 2020-04-08
### Added
- Output rate limiting (`DAMP_RATE_LIM`) after the H1 step-at-break-point finding.

## [3.0.0] - 2018-06-19
### Added
- Initial damping component, `DampApply()`.

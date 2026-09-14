
# Damping — design note
**Document:** VST-DN-2018-031 · **Revision:** 1 · **Date:** 2018-06-19
**Status:** superseded by VST-SA-2021-014 for classification matters

## Purpose

Damping suppresses rack oscillation after a steering input and contributes to
on-centre feel. Without it the system is lively on centre and the driver
reports a "nervous" wheel at motorway speed.

## Classification

Damping is part of the assist torque path and is therefore developed to
**ASIL D**, in line with the assist component.

> This paragraph is out of date. The 2021 assessment decomposed the steering
> feel components below the vehicle goal on the strength of the independent
> safety monitor. The current classification is in VST-SA-2021-014 §3.
> The note is kept because the rationale in §3 below is still the design
> rationale and is not repeated anywhere else.

## 3. Approach

Damping torque is computed from estimated rack velocity and scaled by a
speed-dependent gain. The gain is broken at `DAMP_SPD_BRK` so that low-speed
parking manoeuvres are not damped into treacle, and the output is rate-limited
to avoid a step at the break point.

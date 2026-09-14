
# Safety assessment — steering feel components
**Document:** VST-SA-2021-014 · **Revision:** 3 · **Date:** 2021-10-08
**Author:** a.kovac (functional safety) · **Status:** released

## 1. Scope

This assessment covers the four steering feel components as integrated on the
H1 platform (R-EPS, 7600 N class). It does not cover the arbitration or safety
monitor components, which are assessed separately in VST-SA-2020-009.

## 2. Hazard analysis summary

The relevant vehicle-level hazard is unintended lateral motion arising from
assist torque applied without a corresponding driver request. On the H1
platform this was assigned **ASIL D** at vehicle level, discharged through the
safety monitor (`SWC-SAFEMON`), which bounds commanded torque independently of
the control path.

## 3. Component classification

Because the safety monitor provides an independent bound on commanded torque,
the steering feel components were decomposed below the vehicle-level goal. The
classification agreed with the assessor was as follows.

`SWC-DAMP` and `SWC-HYSTCOMP` are **developed to
ASIL B**. `SWC-FRICCOMP` and `SWC-RTC` are
likewise ASIL B. The decomposition argument rests entirely
on the independence of `SWC-SAFEMON` and on the torque bound being tighter than
the hazard threshold at all vehicle speeds.

## 4. Limitations — read this before reuse

The decomposition above is **platform specific**. It is valid for H1 and for
programmes that carry the same safety monitor with the same torque bound.

A programme that allocates a higher ASIL directly to the damping path — for
example one that treats damping as part of the assist command rather than as a
separate shaping term — cannot inherit this classification. In that case the
component requires re-development to the allocated ASIL, and the work is
substantially the safety case rather than the code: the C is likely to survive
almost unchanged, while the requirements, the verification evidence, the tool
qualification and the argument itself all have to be produced again.

We have not attempted to estimate that effort here. See the PMO records for
comparable re-classifications.

# System Requirements Specification — K2
**Internal document** · Vantis Steering Systems · Revision 3
**Derived from:** CRS-KST-K2-001 Rev B
**Owner:** systems engineering

## 1. Purpose

Transforms the customer requirements in CRS-KST-K2-001 into requirements on
the Vantis system. Every requirement below either traces to a customer
requirement or is marked DERIVED with its rationale.

## 2. Requirements

### SR-EPS-0407 — Rack force at the rack, including internal losses

The EPS assembly shall deliver at least 8000 N at the rack. Motor and gearbox output shall exceed this by the internal friction losses between motor and rack.

- attribute: rack_force_capacity [N]
- ASIL: B · verification: test · owner: systems
- traces to: CR-K2-0101
- rationale: CR-K2-0101 plus the motor-to-rack friction budget. The customer figure is AT THE RACK, so the gearbox must be sized above it.

### SR-EPS-0408 — On-centre steering wheel torque

Steering wheel torque at 30° SWA shall not exceed 2.7 N·m, apportioned per BUD-K2-ONCTR-TRQ.

- attribute: on_center_torque_nm [Nm]
- ASIL: QM · verification: test · owner: systems
- traces to: CR-K2-0103
- rationale: CR-K2-0103, apportioned across the mechanical friction path.

### SR-EPS-0411 — On-centre torque hysteresis

Hysteresis loop width shall not exceed 0.5 N·m, apportioned per BUD-K2-HYST-CTRL.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: QM · verification: test · owner: systems
- traces to: CR-K2-0104
- rationale: CR-K2-0104.

### SR-EPS-0415 — Assist command latency

Total latency from torque sensor edge to motor current command shall not exceed 8 ms, apportioned per BUD-K2-LATENCY.

- attribute: assist_latency_ms [ms]
- ASIL: D · verification: test · owner: systems
- traces to: **DERIVED — no customer parent**
- rationale: DERIVED — no customer requirement states a latency. Set internally from the steering feel target; the customer specifies the feel, not the timing that produces it.

### SR-EPS-0421 — Damping under the unintended-assist safety goal

The damping function shall be developed to ASIL D, since a damping fault can inject torque in the absence of a driver request.

- attribute: (prose only)
- ASIL: D · verification: test · owner: safety
- traces to: CR-K2-0110
- rationale: CR-K2-0110. Damping writes to the same torque command path as assist, so it inherits the safety goal ASIL.

### SR-EPS-0401 — Road wheel angle range

The rack and housing shall permit ±50° of road wheel angle.

- attribute: road_wheel_angle_deg [deg]
- ASIL: QM · verification: test · owner: hardware
- traces to: CR-K2-0102
- rationale: CR-K2-0102, direct.

### SR-EPS-0402 — Steering ratio

The pinion and rack shall realise a 15.8:1 nominal ratio.

- attribute: steering_ratio [ratio]
- ASIL: QM · verification: test · owner: hardware
- traces to: CR-K2-0105
- rationale: CR-K2-0105, direct.

### SR-EPS-0403 — Rack stroke

Rack stroke shall be at least 152 mm.

- attribute: rack_stroke_mm [mm]
- ASIL: QM · verification: test · owner: hardware
- traces to: CR-K2-0106
- rationale: CR-K2-0106, direct.

### SR-EPS-0404 — Peak supply current

Peak supply current shall not exceed 110 A at 12 V.

- attribute: max_current_a [A]
- ASIL: QM · verification: test · owner: hardware
- traces to: CR-K2-0107
- rationale: CR-K2-0107, direct.

### SR-EPS-0405 — Assembly mass

Assembly mass shall not exceed 12.4 kg dry.

- attribute: mass_kg [kg]
- ASIL: QM · verification: test · owner: hardware
- traces to: CR-K2-0108
- rationale: CR-K2-0108, direct.

### SR-EPS-0406 — Operating temperature range

The system shall be fully functional from −40 °C to +85 °C.

- attribute: temp_min_c [C]
- ASIL: QM · verification: test · owner: hardware
- traces to: CR-K2-0109, CR-K2-0121
- rationale: CR-K2-0109 and CR-K2-0121, merged — one temperature range, two customer clauses.

### SR-EPS-0409 — Torque sensor plausibility

Driver torque shall be acquired redundantly and cross-checked before use in the assist path.

- attribute: (prose only)
- ASIL: D · verification: test · owner: safety
- traces to: CR-K2-0110
- rationale: CR-K2-0110. The assist command cannot be safer than the signal it is computed from.

### SR-EPS-0410 — Independent torque limiting

An independent monitor shall bound commanded motor torque against the driver request.

- attribute: (prose only)
- ASIL: D · verification: test · owner: safety
- traces to: CR-K2-0110
- rationale: CR-K2-0110.

### SR-EPS-0412 — Loss of assist degradation

Assist shall degrade progressively rather than step to zero on a detected fault.

- attribute: (prose only)
- ASIL: C · verification: test · owner: safety
- traces to: CR-K2-0111
- rationale: CR-K2-0111.

### SR-EPS-0413 — Mechanical fallback

The mechanical path from wheel to rack shall remain intact on total electrical loss.

- attribute: (prose only)
- ASIL: C · verification: test · owner: hardware
- traces to: CR-K2-0118
- rationale: CR-K2-0118, direct.

### SR-EPS-0414 — Diagnostic services over CAN-FD

The ECU shall implement the customer diagnostic service set over CAN-FD.

- attribute: (prose only)
- ASIL: QM · verification: test · owner: software
- traces to: CR-K2-0114
- rationale: CR-K2-0114, direct.

### SR-EPS-0416 — End-of-line learn time

End-of-line learning shall complete within 25 s.

- attribute: eol_learn_s [s]
- ASIL: QM · verification: test · owner: software
- traces to: CR-K2-0115
- rationale: CR-K2-0115, direct.

### SR-EPS-0417 — Durability

The assembly shall survive 1,500,000 full-stroke-equivalent cycles.

- attribute: lifetime_cycles [cycles]
- ASIL: QM · verification: test · owner: hardware
- traces to: CR-K2-0116
- rationale: CR-K2-0116, direct.

### SR-EPS-0418 — NVH at the driver ear

Steering-induced noise shall not exceed 52 dB(A) at the driver ear.

- attribute: nvh_limit_db [dB]
- ASIL: QM · verification: test · owner: systems
- traces to: CR-K2-0117
- rationale: CR-K2-0117, direct.

### SR-EPS-0419 — Return-to-centre residual angle

Residual steering wheel angle after release shall not exceed 3°.

- attribute: return_to_center_error_deg [deg]
- ASIL: QM · verification: test · owner: calibration
- traces to: CR-K2-0120
- rationale: CR-K2-0120, direct.

### SR-EPS-0420 — ASPICE capability

SYS.1 to SYS.5 and SWE.1 to SWE.6 shall be assessed at capability level 2 or above.

- attribute: (prose only)
- ASIL: QM · verification: test · owner: systems
- traces to: CR-K2-0112
- rationale: CR-K2-0112, direct.

### SR-EPS-0422 — Cybersecurity engineering

A TARA shall be performed and the resulting cybersecurity goals implemented per ISO/SAE 21434.

- attribute: (prose only)
- ASIL: QM · verification: test · owner: systems
- traces to: CR-K2-0113
- rationale: CR-K2-0113, direct.

### SR-EPS-0423 — Piece cost allocation

Bill-of-material cost shall be allocated so that piece price does not exceed EUR 268.

- attribute: piece_price_eur [EUR]
- ASIL: QM · verification: test · owner: systems
- traces to: CR-K2-0122
- rationale: CR-K2-0122, direct.

### SR-EPS-0424 — Programme timing

The development plan shall support SOP on 2028-09-01.

- attribute: (prose only)
- ASIL: QM · verification: test · owner: systems
- traces to: CR-K2-0124
- rationale: CR-K2-0124, direct.

## 3. Open items

- SR-EPS-0421: may be merged with a neighbouring requirement at the next review
- SR-EPS-0409: verification method disputed — analysis vs test
- SR-EPS-0404: value TBC pending the customer response on the test condition

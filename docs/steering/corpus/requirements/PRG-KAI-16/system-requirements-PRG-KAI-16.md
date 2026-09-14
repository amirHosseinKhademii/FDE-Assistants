# System Requirements Specification — Wren
**Internal document** · Vantis Steering Systems · Revision 4
**Derived from:** CRS-KAI-16-001 Rev C
**Owner:** systems engineering

## 1. Purpose

Transforms the customer requirements in CRS-KAI-16-001 into requirements on
the Vantis system. Every requirement below either traces to a customer
requirement or is marked DERIVED with its rationale.

## 2. Requirements

### SR-KAI-16-0368 — mass kg

The system shall achieve mass kg of 14.09 kg.

- attribute: mass_kg [kg]
- ASIL: D · verification: analysis · owner: hardware
- traces to: CR-KAI-16-0274, CR-KAI-16-0269
- rationale: Derived from the customer specification.

### SR-KAI-16-0369 — road wheel angle deg

The system shall achieve road wheel angle deg of 48.85 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: C · verification: test · owner: systems
- traces to: CR-KAI-16-0274, CR-KAI-16-0268
- rationale: Derived from the customer specification.

### SR-KAI-16-0370 — max current a

The system shall achieve max current a of 104.17 A.

- attribute: max_current_a [A]
- ASIL: D · verification: test · owner: calibration
- traces to: CR-KAI-16-0264
- rationale: Derived from the customer specification.

### SR-KAI-16-0371 — nvh limit db

The system shall achieve nvh limit db of 49.21 dB.

- attribute: nvh_limit_db [dB]
- ASIL: QM · verification: test · owner: software
- traces to: CR-KAI-16-0263
- rationale: Derived from the customer specification.

### SR-KAI-16-0372 — mass kg

The system shall achieve mass kg of 14.83 kg.

- attribute: mass_kg [kg]
- ASIL: C · verification: test · owner: systems
- traces to: CR-KAI-16-0263
- rationale: Derived from the customer specification.

### SR-KAI-16-0373 — on center torque nm

The system shall achieve on center torque nm of 2.65 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: B · verification: test · owner: systems
- traces to: CR-KAI-16-0273
- rationale: Derived from the customer specification.

### SR-KAI-16-0374 — on center torque nm

The system shall achieve on center torque nm of 2.56 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: D · verification: analysis · owner: systems
- traces to: CR-KAI-16-0273
- rationale: Derived from the customer specification.

### SR-KAI-16-0375 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.88 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: C · verification: analysis · owner: safety
- traces to: CR-KAI-16-0275
- rationale: Derived from the customer specification.

### SR-KAI-16-0376 — road wheel angle deg

The system shall achieve road wheel angle deg of 51.97 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: D · verification: test · owner: safety
- traces to: CR-KAI-16-0271, CR-KAI-16-0267
- rationale: Derived from the customer specification.

### SR-KAI-16-0377 — nvh limit db

The system shall achieve nvh limit db of 57.8 dB.

- attribute: nvh_limit_db [dB]
- ASIL: C · verification: analysis · owner: safety
- traces to: CR-KAI-16-0274
- rationale: Derived from the customer specification.

### SR-KAI-16-0378 — on center torque nm

The system shall achieve on center torque nm of 2.14 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: B · verification: test · owner: hardware
- traces to: CR-KAI-16-0267
- rationale: Derived from the customer specification.

### SR-KAI-16-0379 — max current a

The system shall achieve max current a of 94.22 A.

- attribute: max_current_a [A]
- ASIL: B · verification: test · owner: hardware
- traces to: CR-KAI-16-0267
- rationale: Derived from the customer specification.

### SR-KAI-16-0380 — max current a

The system shall achieve max current a of 100.55 A.

- attribute: max_current_a [A]
- ASIL: B · verification: analysis · owner: hardware
- traces to: CR-KAI-16-0268
- rationale: Derived from the customer specification.

### SR-KAI-16-0381 — assist latency ms

The system shall achieve assist latency ms of 6.6 ms.

- attribute: assist_latency_ms [ms]
- ASIL: QM · verification: analysis · owner: software
- traces to: CR-KAI-16-0275
- rationale: Derived from the customer specification.

### SR-KAI-16-0382 — nvh limit db

The system shall achieve nvh limit db of 48.07 dB.

- attribute: nvh_limit_db [dB]
- ASIL: C · verification: test · owner: systems
- traces to: CR-KAI-16-0271, CR-KAI-16-0272
- rationale: Derived from the customer specification.

### SR-KAI-16-0383 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.67 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: QM · verification: test · owner: systems
- traces to: CR-KAI-16-0265
- rationale: Derived from the customer specification.

### SR-KAI-16-0384 — on center torque nm

The system shall achieve on center torque nm of 3.35 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: C · verification: test · owner: systems
- traces to: CR-KAI-16-0275
- rationale: Derived from the customer specification.

### SR-KAI-16-0385 — rack force capacity

The system shall achieve rack force capacity of 9237.24 N.

- attribute: rack_force_capacity [N]
- ASIL: QM · verification: test · owner: hardware
- traces to: CR-KAI-16-0274
- rationale: Derived from the customer specification.

### SR-KAI-16-0386 — max current a

The system shall achieve max current a of 82.25 A.

- attribute: max_current_a [A]
- ASIL: B · verification: analysis · owner: hardware
- traces to: CR-KAI-16-0272
- rationale: Derived from the customer specification.

### SR-KAI-16-0387 — nvh limit db

The system shall achieve nvh limit db of 55.44 dB.

- attribute: nvh_limit_db [dB]
- ASIL: D · verification: test · owner: safety
- traces to: CR-KAI-16-0275, CR-KAI-16-0268
- rationale: Derived from the customer specification.

## 3. Open items

- SR-KAI-16-0377: may be merged with a neighbouring requirement at the next review
- SR-KAI-16-0373: may be merged with a neighbouring requirement at the next review
- SR-KAI-16-0376: verification method disputed — analysis vs test

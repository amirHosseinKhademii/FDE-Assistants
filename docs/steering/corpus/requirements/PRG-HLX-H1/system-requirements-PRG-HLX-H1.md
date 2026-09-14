# System Requirements Specification — H1
**Internal document** · Vantis Steering Systems · Revision 5
**Derived from:** CRS-HLX-H1-001 Rev B
**Owner:** systems engineering

## 1. Purpose

Transforms the customer requirements in CRS-HLX-H1-001 into requirements on
the Vantis system. Every requirement below either traces to a customer
requirement or is marked DERIVED with its rationale.

## 2. Requirements

### SR-HLX-H1-0001 — mass kg

The system shall achieve mass kg of 13.64 kg.

- attribute: mass_kg [kg]
- ASIL: QM · verification: test · owner: hardware
- traces to: CR-HLX-H1-0013
- rationale: Derived from the customer specification.

### SR-HLX-H1-0002 — assist latency ms

The system shall achieve assist latency ms of 9.71 ms.

- attribute: assist_latency_ms [ms]
- ASIL: D · verification: test · owner: calibration
- traces to: CR-HLX-H1-0015
- rationale: Derived from the customer specification.

### SR-HLX-H1-0003 — on center torque nm

The system shall achieve on center torque nm of 2.14 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: B · verification: test · owner: safety
- traces to: CR-HLX-H1-0009, CR-HLX-H1-0016
- rationale: Derived from the customer specification.

### SR-HLX-H1-0004 — road wheel angle deg

The system shall achieve road wheel angle deg of 52.65 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: C · verification: test · owner: systems
- traces to: CR-HLX-H1-0014, CR-HLX-H1-0004
- rationale: Derived from the customer specification.

### SR-HLX-H1-0005 — rack force capacity

The system shall achieve rack force capacity of 7972.08 N.

- attribute: rack_force_capacity [N]
- ASIL: B · verification: test · owner: safety
- traces to: CR-HLX-H1-0003
- rationale: Derived from the customer specification.

### SR-HLX-H1-0006 — road wheel angle deg

The system shall achieve road wheel angle deg of 51.23 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: C · verification: analysis · owner: software
- traces to: CR-HLX-H1-0002, CR-HLX-H1-0003
- rationale: Derived from the customer specification.

### SR-HLX-H1-0007 — rack force capacity

The system shall achieve rack force capacity of 10112.55 N.

- attribute: rack_force_capacity [N]
- ASIL: QM · verification: test · owner: systems
- traces to: CR-HLX-H1-0008, CR-HLX-H1-0015
- rationale: Derived from the customer specification.

### SR-HLX-H1-0008 — max current a

The system shall achieve max current a of 102.03 A.

- attribute: max_current_a [A]
- ASIL: B · verification: test · owner: hardware
- traces to: CR-HLX-H1-0014, CR-HLX-H1-0002
- rationale: Derived from the customer specification.

### SR-HLX-H1-0009 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.72 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: QM · verification: analysis · owner: hardware
- traces to: CR-HLX-H1-0016
- rationale: Derived from the customer specification.

### SR-HLX-H1-0010 — max current a

The system shall achieve max current a of 99.26 A.

- attribute: max_current_a [A]
- ASIL: D · verification: analysis · owner: systems
- traces to: CR-HLX-H1-0002, CR-HLX-H1-0001
- rationale: Derived from the customer specification.

### SR-HLX-H1-0011 — max current a

The system shall achieve max current a of 98.19 A.

- attribute: max_current_a [A]
- ASIL: D · verification: analysis · owner: software
- traces to: CR-HLX-H1-0009
- rationale: Derived from the customer specification.

### SR-HLX-H1-0012 — rack force capacity

The system shall achieve rack force capacity of 8742.37 N.

- attribute: rack_force_capacity [N]
- ASIL: D · verification: test · owner: safety
- traces to: CR-HLX-H1-0003, CR-HLX-H1-0009
- rationale: Derived from the customer specification.

### SR-HLX-H1-0013 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.59 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: B · verification: analysis · owner: calibration
- traces to: CR-HLX-H1-0011, CR-HLX-H1-0014
- rationale: Derived from the customer specification.

### SR-HLX-H1-0014 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.45 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: B · verification: analysis · owner: calibration
- traces to: CR-HLX-H1-0009, CR-HLX-H1-0006
- rationale: Derived from the customer specification.

### SR-HLX-H1-0015 — road wheel angle deg

The system shall achieve road wheel angle deg of 49.27 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: D · verification: analysis · owner: software
- traces to: CR-HLX-H1-0013
- rationale: Derived from the customer specification.

### SR-HLX-H1-0016 — assist latency ms

The system shall achieve assist latency ms of 10.15 ms.

- attribute: assist_latency_ms [ms]
- ASIL: B · verification: analysis · owner: safety
- traces to: CR-HLX-H1-0014, CR-HLX-H1-0006
- rationale: Derived from the customer specification.

### SR-HLX-H1-0017 — road wheel angle deg

The system shall achieve road wheel angle deg of 46.6 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: D · verification: test · owner: software
- traces to: CR-HLX-H1-0004
- rationale: Derived from the customer specification.

### SR-HLX-H1-0018 — assist latency ms

The system shall achieve assist latency ms of 7.26 ms.

- attribute: assist_latency_ms [ms]
- ASIL: C · verification: test · owner: hardware
- traces to: CR-HLX-H1-0011
- rationale: Derived from the customer specification.

### SR-HLX-H1-0019 — rack force capacity

The system shall achieve rack force capacity of 7645.42 N.

- attribute: rack_force_capacity [N]
- ASIL: D · verification: analysis · owner: hardware
- traces to: CR-HLX-H1-0002, CR-HLX-H1-0008
- rationale: Derived from the customer specification.

### SR-HLX-H1-0020 — assist latency ms

The system shall achieve assist latency ms of 10.94 ms.

- attribute: assist_latency_ms [ms]
- ASIL: D · verification: analysis · owner: safety
- traces to: CR-HLX-H1-0007, CR-HLX-H1-0013
- rationale: Derived from the customer specification.

### SR-HLX-H1-0021 — road wheel angle deg

The system shall achieve road wheel angle deg of 47.94 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: QM · verification: analysis · owner: safety
- traces to: CR-HLX-H1-0010
- rationale: Derived from the customer specification.

### SR-HLX-H1-0022 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.65 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: D · verification: test · owner: hardware
- traces to: CR-HLX-H1-0002, CR-HLX-H1-0011
- rationale: Derived from the customer specification.

## 3. Open items

- SR-HLX-H1-0019: verification method disputed — analysis vs test
- SR-HLX-H1-0016: value TBC pending the customer response on the test condition
- SR-HLX-H1-0007: verification method disputed — analysis vs test
- SR-HLX-H1-0015: verification method disputed — analysis vs test

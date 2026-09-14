# System Requirements Specification — Borea
**Internal document** · Vantis Steering Systems · Revision 2
**Derived from:** CRS-CHV-36-001 Rev C
**Owner:** systems engineering

## 1. Purpose

Transforms the customer requirements in CRS-CHV-36-001 into requirements on
the Vantis system. Every requirement below either traces to a customer
requirement or is marked DERIVED with its rationale.

## 2. Requirements

### SR-CHV-36-0848 — rack force capacity

The system shall achieve rack force capacity of 8237.61 N.

- attribute: rack_force_capacity [N]
- ASIL: B · verification: analysis · owner: calibration
- traces to: CR-CHV-36-0606
- rationale: Derived from the customer specification.

### SR-CHV-36-0849 — assist latency ms

The system shall achieve assist latency ms of 8.54 ms.

- attribute: assist_latency_ms [ms]
- ASIL: C · verification: analysis · owner: safety
- traces to: CR-CHV-36-0606, CR-CHV-36-0612
- rationale: Derived from the customer specification.

### SR-CHV-36-0850 — rack force capacity

The system shall achieve rack force capacity of 10259.68 N.

- attribute: rack_force_capacity [N]
- ASIL: QM · verification: analysis · owner: safety
- traces to: CR-CHV-36-0614, CR-CHV-36-0608
- rationale: Derived from the customer specification.

### SR-CHV-36-0851 — road wheel angle deg

The system shall achieve road wheel angle deg of 53.27 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: B · verification: test · owner: hardware
- traces to: CR-CHV-36-0606
- rationale: Derived from the customer specification.

### SR-CHV-36-0852 — on center torque nm

The system shall achieve on center torque nm of 3.38 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: D · verification: analysis · owner: systems
- traces to: CR-CHV-36-0608, CR-CHV-36-0612
- rationale: Derived from the customer specification.

### SR-CHV-36-0853 — max current a

The system shall achieve max current a of 84.16 A.

- attribute: max_current_a [A]
- ASIL: B · verification: test · owner: software
- traces to: CR-CHV-36-0609
- rationale: Derived from the customer specification.

### SR-CHV-36-0854 — rack force capacity

The system shall achieve rack force capacity of 8640.05 N.

- attribute: rack_force_capacity [N]
- ASIL: D · verification: analysis · owner: software
- traces to: CR-CHV-36-0617, CR-CHV-36-0614
- rationale: Derived from the customer specification.

### SR-CHV-36-0855 — max current a

The system shall achieve max current a of 78.66 A.

- attribute: max_current_a [A]
- ASIL: QM · verification: test · owner: calibration
- traces to: CR-CHV-36-0612, CR-CHV-36-0608
- rationale: Derived from the customer specification.

### SR-CHV-36-0856 — road wheel angle deg

The system shall achieve road wheel angle deg of 54.65 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: B · verification: test · owner: calibration
- traces to: CR-CHV-36-0612
- rationale: Derived from the customer specification.

### SR-CHV-36-0857 — rack force capacity

The system shall achieve rack force capacity of 9269.26 N.

- attribute: rack_force_capacity [N]
- ASIL: B · verification: analysis · owner: software
- traces to: CR-CHV-36-0614
- rationale: Derived from the customer specification.

### SR-CHV-36-0858 — max current a

The system shall achieve max current a of 69.88 A.

- attribute: max_current_a [A]
- ASIL: QM · verification: test · owner: hardware
- traces to: CR-CHV-36-0613
- rationale: Derived from the customer specification.

### SR-CHV-36-0859 — mass kg

The system shall achieve mass kg of 13.6 kg.

- attribute: mass_kg [kg]
- ASIL: QM · verification: analysis · owner: safety
- traces to: CR-CHV-36-0607
- rationale: Derived from the customer specification.

### SR-CHV-36-0860 — rack force capacity

The system shall achieve rack force capacity of 10881.41 N.

- attribute: rack_force_capacity [N]
- ASIL: C · verification: analysis · owner: hardware
- traces to: CR-CHV-36-0614, CR-CHV-36-0615
- rationale: Derived from the customer specification.

### SR-CHV-36-0861 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.53 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: D · verification: analysis · owner: software
- traces to: CR-CHV-36-0615
- rationale: Derived from the customer specification.

### SR-CHV-36-0862 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.56 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: C · verification: test · owner: safety
- traces to: CR-CHV-36-0606
- rationale: Derived from the customer specification.

### SR-CHV-36-0863 — road wheel angle deg

The system shall achieve road wheel angle deg of 53.32 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: B · verification: analysis · owner: hardware
- traces to: CR-CHV-36-0617, CR-CHV-36-0610
- rationale: Derived from the customer specification.

### SR-CHV-36-0864 — mass kg

The system shall achieve mass kg of 10.83 kg.

- attribute: mass_kg [kg]
- ASIL: D · verification: test · owner: calibration
- traces to: CR-CHV-36-0615
- rationale: Derived from the customer specification.

## 3. Open items

- SR-CHV-36-0858: ASIL to be confirmed after the hazard analysis update
- SR-CHV-36-0856: may be merged with a neighbouring requirement at the next review
- SR-CHV-36-0851: verification method disputed — analysis vs test

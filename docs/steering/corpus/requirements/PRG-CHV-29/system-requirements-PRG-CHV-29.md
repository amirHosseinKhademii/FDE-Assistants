# System Requirements Specification — Aster
**Internal document** · Vantis Steering Systems · Revision 4
**Derived from:** CRS-CHV-29-001 Rev B
**Owner:** systems engineering

## 1. Purpose

Transforms the customer requirements in CRS-CHV-29-001 into requirements on
the Vantis system. Every requirement below either traces to a customer
requirement or is marked DERIVED with its rationale.

## 2. Requirements

### SR-CHV-29-0678 — road wheel angle deg

The system shall achieve road wheel angle deg of 54.51 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: B · verification: analysis · owner: software
- traces to: CR-CHV-29-0491, CR-CHV-29-0484
- rationale: Derived from the customer specification.

### SR-CHV-29-0679 — rack force capacity

The system shall achieve rack force capacity of 9526.69 N.

- attribute: rack_force_capacity [N]
- ASIL: B · verification: analysis · owner: safety
- traces to: CR-CHV-29-0488, CR-CHV-29-0486
- rationale: Derived from the customer specification.

### SR-CHV-29-0680 — nvh limit db

The system shall achieve nvh limit db of 54.77 dB.

- attribute: nvh_limit_db [dB]
- ASIL: C · verification: test · owner: systems
- traces to: CR-CHV-29-0489, CR-CHV-29-0490
- rationale: Derived from the customer specification.

### SR-CHV-29-0681 — mass kg

The system shall achieve mass kg of 12.15 kg.

- attribute: mass_kg [kg]
- ASIL: B · verification: analysis · owner: calibration
- traces to: CR-CHV-29-0496
- rationale: Derived from the customer specification.

### SR-CHV-29-0682 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.76 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: D · verification: analysis · owner: safety
- traces to: CR-CHV-29-0491, CR-CHV-29-0484
- rationale: Derived from the customer specification.

### SR-CHV-29-0683 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.36 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: D · verification: analysis · owner: software
- traces to: CR-CHV-29-0487
- rationale: Derived from the customer specification.

### SR-CHV-29-0684 — assist latency ms

The system shall achieve assist latency ms of 10.89 ms.

- attribute: assist_latency_ms [ms]
- ASIL: C · verification: test · owner: software
- traces to: CR-CHV-29-0496, CR-CHV-29-0495
- rationale: Derived from the customer specification.

### SR-CHV-29-0685 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.87 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: QM · verification: analysis · owner: systems
- traces to: CR-CHV-29-0485, CR-CHV-29-0484
- rationale: Derived from the customer specification.

### SR-CHV-29-0686 — max current a

The system shall achieve max current a of 74.36 A.

- attribute: max_current_a [A]
- ASIL: D · verification: analysis · owner: calibration
- traces to: CR-CHV-29-0491, CR-CHV-29-0487
- rationale: Derived from the customer specification.

### SR-CHV-29-0687 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.71 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: QM · verification: test · owner: systems
- traces to: CR-CHV-29-0495, CR-CHV-29-0496
- rationale: Derived from the customer specification.

### SR-CHV-29-0688 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.83 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: C · verification: analysis · owner: systems
- traces to: CR-CHV-29-0494
- rationale: Derived from the customer specification.

### SR-CHV-29-0689 — on center torque nm

The system shall achieve on center torque nm of 3.31 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: QM · verification: test · owner: software
- traces to: CR-CHV-29-0486, CR-CHV-29-0487
- rationale: Derived from the customer specification.

### SR-CHV-29-0690 — road wheel angle deg

The system shall achieve road wheel angle deg of 47.84 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: QM · verification: test · owner: systems
- traces to: CR-CHV-29-0490
- rationale: Derived from the customer specification.

### SR-CHV-29-0691 — max current a

The system shall achieve max current a of 63.29 A.

- attribute: max_current_a [A]
- ASIL: B · verification: test · owner: hardware
- traces to: CR-CHV-29-0493, CR-CHV-29-0486
- rationale: Derived from the customer specification.

### SR-CHV-29-0692 — assist latency ms

The system shall achieve assist latency ms of 10.18 ms.

- attribute: assist_latency_ms [ms]
- ASIL: C · verification: test · owner: calibration
- traces to: CR-CHV-29-0487, CR-CHV-29-0493
- rationale: Derived from the customer specification.

### SR-CHV-29-0693 — max current a

The system shall achieve max current a of 119.7 A.

- attribute: max_current_a [A]
- ASIL: B · verification: analysis · owner: software
- traces to: CR-CHV-29-0493, CR-CHV-29-0484
- rationale: Derived from the customer specification.

### SR-CHV-29-0694 — max current a

The system shall achieve max current a of 105.27 A.

- attribute: max_current_a [A]
- ASIL: D · verification: analysis · owner: safety
- traces to: CR-CHV-29-0487, CR-CHV-29-0492
- rationale: Derived from the customer specification.

### SR-CHV-29-0695 — assist latency ms

The system shall achieve assist latency ms of 7.1 ms.

- attribute: assist_latency_ms [ms]
- ASIL: C · verification: analysis · owner: calibration
- traces to: CR-CHV-29-0496
- rationale: Derived from the customer specification.

## 3. Open items

- SR-CHV-29-0685: value TBC pending the customer response on the test condition
- SR-CHV-29-0687: verification method disputed — analysis vs test
- SR-CHV-29-0683: verification method disputed — analysis vs test
- SR-CHV-29-0694: ASIL to be confirmed after the hazard analysis update

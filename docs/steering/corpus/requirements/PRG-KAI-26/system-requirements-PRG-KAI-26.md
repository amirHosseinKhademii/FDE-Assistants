# System Requirements Specification — Kite
**Internal document** · Vantis Steering Systems · Revision 3
**Derived from:** CRS-KAI-26-001 Rev A
**Owner:** systems engineering

## 1. Purpose

Transforms the customer requirements in CRS-KAI-26-001 into requirements on
the Vantis system. Every requirement below either traces to a customer
requirement or is marked DERIVED with its rationale.

## 2. Requirements

### SR-KAI-26-0617 — mass kg

The system shall achieve mass kg of 12.96 kg.

- attribute: mass_kg [kg]
- ASIL: B · verification: analysis · owner: safety
- traces to: CR-KAI-26-0450
- rationale: Derived from the customer specification.

### SR-KAI-26-0618 — on center torque nm

The system shall achieve on center torque nm of 2.82 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: D · verification: analysis · owner: calibration
- traces to: CR-KAI-26-0446
- rationale: Derived from the customer specification.

### SR-KAI-26-0619 — mass kg

The system shall achieve mass kg of 13.79 kg.

- attribute: mass_kg [kg]
- ASIL: QM · verification: test · owner: software
- traces to: CR-KAI-26-0452
- rationale: Derived from the customer specification.

### SR-KAI-26-0620 — on center torque nm

The system shall achieve on center torque nm of 3.29 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: B · verification: test · owner: calibration
- traces to: CR-KAI-26-0442
- rationale: Derived from the customer specification.

### SR-KAI-26-0621 — nvh limit db

The system shall achieve nvh limit db of 49.53 dB.

- attribute: nvh_limit_db [dB]
- ASIL: D · verification: test · owner: software
- traces to: CR-KAI-26-0446, CR-KAI-26-0441
- rationale: Derived from the customer specification.

### SR-KAI-26-0622 — max current a

The system shall achieve max current a of 94.44 A.

- attribute: max_current_a [A]
- ASIL: C · verification: test · owner: calibration
- traces to: CR-KAI-26-0452, CR-KAI-26-0447
- rationale: Derived from the customer specification.

### SR-KAI-26-0623 — nvh limit db

The system shall achieve nvh limit db of 53.05 dB.

- attribute: nvh_limit_db [dB]
- ASIL: C · verification: analysis · owner: calibration
- traces to: CR-KAI-26-0443, CR-KAI-26-0449
- rationale: Derived from the customer specification.

### SR-KAI-26-0624 — nvh limit db

The system shall achieve nvh limit db of 49.43 dB.

- attribute: nvh_limit_db [dB]
- ASIL: B · verification: analysis · owner: safety
- traces to: CR-KAI-26-0447
- rationale: Derived from the customer specification.

### SR-KAI-26-0625 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.34 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: D · verification: test · owner: safety
- traces to: CR-KAI-26-0449
- rationale: Derived from the customer specification.

### SR-KAI-26-0626 — assist latency ms

The system shall achieve assist latency ms of 9.46 ms.

- attribute: assist_latency_ms [ms]
- ASIL: C · verification: test · owner: software
- traces to: CR-KAI-26-0451
- rationale: Derived from the customer specification.

### SR-KAI-26-0627 — mass kg

The system shall achieve mass kg of 13.9 kg.

- attribute: mass_kg [kg]
- ASIL: QM · verification: test · owner: calibration
- traces to: CR-KAI-26-0441, CR-KAI-26-0451
- rationale: Derived from the customer specification.

### SR-KAI-26-0628 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.47 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: B · verification: analysis · owner: hardware
- traces to: CR-KAI-26-0443, CR-KAI-26-0444
- rationale: Derived from the customer specification.

### SR-KAI-26-0629 — road wheel angle deg

The system shall achieve road wheel angle deg of 54.9 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: B · verification: analysis · owner: systems
- traces to: CR-KAI-26-0443
- rationale: Derived from the customer specification.

### SR-KAI-26-0630 — max current a

The system shall achieve max current a of 100.56 A.

- attribute: max_current_a [A]
- ASIL: QM · verification: analysis · owner: safety
- traces to: CR-KAI-26-0450, CR-KAI-26-0441
- rationale: Derived from the customer specification.

### SR-KAI-26-0631 — on center torque nm

The system shall achieve on center torque nm of 2.34 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: B · verification: test · owner: hardware
- traces to: CR-KAI-26-0449, CR-KAI-26-0444
- rationale: Derived from the customer specification.

### SR-KAI-26-0632 — road wheel angle deg

The system shall achieve road wheel angle deg of 47.57 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: C · verification: test · owner: hardware
- traces to: CR-KAI-26-0447
- rationale: Derived from the customer specification.

### SR-KAI-26-0633 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.68 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: B · verification: analysis · owner: software
- traces to: CR-KAI-26-0449, CR-KAI-26-0451
- rationale: Derived from the customer specification.

## 3. Open items

- SR-KAI-26-0621: may be merged with a neighbouring requirement at the next review
- SR-KAI-26-0633: ASIL to be confirmed after the hazard analysis update
- SR-KAI-26-0622: ASIL to be confirmed after the hazard analysis update
- SR-KAI-26-0626: verification method disputed — analysis vs test

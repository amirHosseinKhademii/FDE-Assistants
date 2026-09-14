# System Requirements Specification — Flint
**Internal document** · Vantis Steering Systems · Revision 2
**Derived from:** CRS-KAI-34-001 Rev A
**Owner:** systems engineering

## 1. Purpose

Transforms the customer requirements in CRS-KAI-34-001 into requirements on
the Vantis system. Every requirement below either traces to a customer
requirement or is marked DERIVED with its rationale.

## 2. Requirements

### SR-KAI-34-0805 — road wheel angle deg

The system shall achieve road wheel angle deg of 45.57 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: D · verification: analysis · owner: software
- traces to: CR-KAI-34-0580
- rationale: Derived from the customer specification.

### SR-KAI-34-0806 — road wheel angle deg

The system shall achieve road wheel angle deg of 54.57 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: B · verification: analysis · owner: safety
- traces to: CR-KAI-34-0577
- rationale: Derived from the customer specification.

### SR-KAI-34-0807 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.4 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: QM · verification: test · owner: hardware
- traces to: CR-KAI-34-0575, CR-KAI-34-0580
- rationale: Derived from the customer specification.

### SR-KAI-34-0808 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.87 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: B · verification: analysis · owner: software
- traces to: CR-KAI-34-0577
- rationale: Derived from the customer specification.

### SR-KAI-34-0809 — nvh limit db

The system shall achieve nvh limit db of 52.89 dB.

- attribute: nvh_limit_db [dB]
- ASIL: D · verification: analysis · owner: software
- traces to: CR-KAI-34-0576
- rationale: Derived from the customer specification.

### SR-KAI-34-0810 — nvh limit db

The system shall achieve nvh limit db of 56.72 dB.

- attribute: nvh_limit_db [dB]
- ASIL: QM · verification: test · owner: hardware
- traces to: CR-KAI-34-0583, CR-KAI-34-0580
- rationale: Derived from the customer specification.

### SR-KAI-34-0811 — mass kg

The system shall achieve mass kg of 10.66 kg.

- attribute: mass_kg [kg]
- ASIL: C · verification: analysis · owner: systems
- traces to: CR-KAI-34-0578
- rationale: Derived from the customer specification.

### SR-KAI-34-0812 — nvh limit db

The system shall achieve nvh limit db of 57.03 dB.

- attribute: nvh_limit_db [dB]
- ASIL: D · verification: analysis · owner: safety
- traces to: CR-KAI-34-0586, CR-KAI-34-0578
- rationale: Derived from the customer specification.

### SR-KAI-34-0813 — assist latency ms

The system shall achieve assist latency ms of 10.73 ms.

- attribute: assist_latency_ms [ms]
- ASIL: B · verification: analysis · owner: systems
- traces to: CR-KAI-34-0578, CR-KAI-34-0582
- rationale: Derived from the customer specification.

### SR-KAI-34-0814 — road wheel angle deg

The system shall achieve road wheel angle deg of 51.84 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: C · verification: analysis · owner: calibration
- traces to: CR-KAI-34-0586, CR-KAI-34-0575
- rationale: Derived from the customer specification.

### SR-KAI-34-0815 — on center torque nm

The system shall achieve on center torque nm of 2.84 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: D · verification: analysis · owner: systems
- traces to: CR-KAI-34-0583
- rationale: Derived from the customer specification.

### SR-KAI-34-0816 — mass kg

The system shall achieve mass kg of 9.24 kg.

- attribute: mass_kg [kg]
- ASIL: B · verification: analysis · owner: calibration
- traces to: CR-KAI-34-0585
- rationale: Derived from the customer specification.

### SR-KAI-34-0817 — on center torque nm

The system shall achieve on center torque nm of 2.6 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: C · verification: analysis · owner: software
- traces to: CR-KAI-34-0584
- rationale: Derived from the customer specification.

### SR-KAI-34-0818 — nvh limit db

The system shall achieve nvh limit db of 50.62 dB.

- attribute: nvh_limit_db [dB]
- ASIL: C · verification: test · owner: hardware
- traces to: CR-KAI-34-0575
- rationale: Derived from the customer specification.

### SR-KAI-34-0819 — max current a

The system shall achieve max current a of 79.92 A.

- attribute: max_current_a [A]
- ASIL: B · verification: analysis · owner: hardware
- traces to: CR-KAI-34-0575, CR-KAI-34-0580
- rationale: Derived from the customer specification.

### SR-KAI-34-0820 — nvh limit db

The system shall achieve nvh limit db of 54.08 dB.

- attribute: nvh_limit_db [dB]
- ASIL: B · verification: analysis · owner: calibration
- traces to: CR-KAI-34-0581
- rationale: Derived from the customer specification.

### SR-KAI-34-0821 — on center torque nm

The system shall achieve on center torque nm of 2.2 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: C · verification: test · owner: systems
- traces to: CR-KAI-34-0576
- rationale: Derived from the customer specification.

### SR-KAI-34-0822 — mass kg

The system shall achieve mass kg of 10.57 kg.

- attribute: mass_kg [kg]
- ASIL: B · verification: analysis · owner: systems
- traces to: CR-KAI-34-0578
- rationale: Derived from the customer specification.

## 3. Open items

- SR-KAI-34-0811: value TBC pending the customer response on the test condition
- SR-KAI-34-0806: verification method disputed — analysis vs test

# System Requirements Specification — Delve
**Internal document** · Vantis Steering Systems · Revision 4
**Derived from:** CRS-TDR-01-001 Rev C
**Owner:** systems engineering

## 1. Purpose

Transforms the customer requirements in CRS-TDR-01-001 into requirements on
the Vantis system. Every requirement below either traces to a customer
requirement or is marked DERIVED with its rationale.

## 2. Requirements

### SR-TDR-01-0023 — nvh limit db

The system shall achieve nvh limit db of 53.68 dB.

- attribute: nvh_limit_db [dB]
- ASIL: QM · verification: test · owner: hardware
- traces to: CR-TDR-01-0037, CR-TDR-01-0027
- rationale: Derived from the customer specification.

### SR-TDR-01-0024 — road wheel angle deg

The system shall achieve road wheel angle deg of 52.92 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: D · verification: analysis · owner: systems
- traces to: CR-TDR-01-0033
- rationale: Derived from the customer specification.

### SR-TDR-01-0025 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.54 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: QM · verification: analysis · owner: hardware
- traces to: CR-TDR-01-0038
- rationale: Derived from the customer specification.

### SR-TDR-01-0026 — mass kg

The system shall achieve mass kg of 12.39 kg.

- attribute: mass_kg [kg]
- ASIL: C · verification: analysis · owner: safety
- traces to: CR-TDR-01-0021, CR-TDR-01-0030
- rationale: Derived from the customer specification.

### SR-TDR-01-0027 — assist latency ms

The system shall achieve assist latency ms of 8.31 ms.

- attribute: assist_latency_ms [ms]
- ASIL: C · verification: analysis · owner: systems
- traces to: CR-TDR-01-0022
- rationale: Derived from the customer specification.

### SR-TDR-01-0028 — nvh limit db

The system shall achieve nvh limit db of 55.03 dB.

- attribute: nvh_limit_db [dB]
- ASIL: D · verification: analysis · owner: software
- traces to: CR-TDR-01-0034, CR-TDR-01-0022
- rationale: Derived from the customer specification.

### SR-TDR-01-0029 — on center torque nm

The system shall achieve on center torque nm of 2.75 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: D · verification: analysis · owner: hardware
- traces to: CR-TDR-01-0026
- rationale: Derived from the customer specification.

### SR-TDR-01-0030 — max current a

The system shall achieve max current a of 112.98 A.

- attribute: max_current_a [A]
- ASIL: B · verification: test · owner: calibration
- traces to: CR-TDR-01-0023, CR-TDR-01-0029
- rationale: Derived from the customer specification.

### SR-TDR-01-0031 — assist latency ms

The system shall achieve assist latency ms of 8.35 ms.

- attribute: assist_latency_ms [ms]
- ASIL: D · verification: test · owner: software
- traces to: CR-TDR-01-0022
- rationale: Derived from the customer specification.

### SR-TDR-01-0032 — rack force capacity

The system shall achieve rack force capacity of 5614.57 N.

- attribute: rack_force_capacity [N]
- ASIL: D · verification: analysis · owner: safety
- traces to: CR-TDR-01-0022, CR-TDR-01-0020
- rationale: Derived from the customer specification.

### SR-TDR-01-0033 — rack force capacity

The system shall achieve rack force capacity of 6340.61 N.

- attribute: rack_force_capacity [N]
- ASIL: C · verification: test · owner: software
- traces to: CR-TDR-01-0025
- rationale: Derived from the customer specification.

### SR-TDR-01-0034 — max current a

The system shall achieve max current a of 115.62 A.

- attribute: max_current_a [A]
- ASIL: QM · verification: analysis · owner: safety
- traces to: CR-TDR-01-0022, CR-TDR-01-0018
- rationale: Derived from the customer specification.

### SR-TDR-01-0035 — mass kg

The system shall achieve mass kg of 11.66 kg.

- attribute: mass_kg [kg]
- ASIL: D · verification: test · owner: calibration
- traces to: CR-TDR-01-0037
- rationale: Derived from the customer specification.

### SR-TDR-01-0036 — road wheel angle deg

The system shall achieve road wheel angle deg of 49.58 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: QM · verification: test · owner: safety
- traces to: CR-TDR-01-0025
- rationale: Derived from the customer specification.

### SR-TDR-01-0037 — on center torque nm

The system shall achieve on center torque nm of 2.2 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: B · verification: test · owner: safety
- traces to: CR-TDR-01-0025, CR-TDR-01-0017
- rationale: Derived from the customer specification.

### SR-TDR-01-0038 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.86 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: QM · verification: test · owner: software
- traces to: CR-TDR-01-0036
- rationale: Derived from the customer specification.

### SR-TDR-01-0039 — on center torque nm

The system shall achieve on center torque nm of 2.49 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: B · verification: test · owner: safety
- traces to: CR-TDR-01-0038, CR-TDR-01-0034
- rationale: Derived from the customer specification.

### SR-TDR-01-0040 — assist latency ms

The system shall achieve assist latency ms of 6.66 ms.

- attribute: assist_latency_ms [ms]
- ASIL: C · verification: test · owner: hardware
- traces to: CR-TDR-01-0031
- rationale: Derived from the customer specification.

### SR-TDR-01-0041 — rack force capacity

The system shall achieve rack force capacity of 9572.17 N.

- attribute: rack_force_capacity [N]
- ASIL: B · verification: test · owner: software
- traces to: CR-TDR-01-0019
- rationale: Derived from the customer specification.

### SR-TDR-01-0042 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.71 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: B · verification: test · owner: safety
- traces to: CR-TDR-01-0035
- rationale: Derived from the customer specification.

### SR-TDR-01-0043 — mass kg

The system shall achieve mass kg of 9.95 kg.

- attribute: mass_kg [kg]
- ASIL: QM · verification: analysis · owner: software
- traces to: CR-TDR-01-0023, CR-TDR-01-0022
- rationale: Derived from the customer specification.

### SR-TDR-01-0044 — mass kg

The system shall achieve mass kg of 10.16 kg.

- attribute: mass_kg [kg]
- ASIL: B · verification: test · owner: calibration
- traces to: CR-TDR-01-0023
- rationale: Derived from the customer specification.

### SR-TDR-01-0045 — max current a

The system shall achieve max current a of 94.45 A.

- attribute: max_current_a [A]
- ASIL: C · verification: test · owner: safety
- traces to: CR-TDR-01-0023, CR-TDR-01-0033
- rationale: Derived from the customer specification.

### SR-TDR-01-0046 — nvh limit db

The system shall achieve nvh limit db of 54.72 dB.

- attribute: nvh_limit_db [dB]
- ASIL: D · verification: analysis · owner: systems
- traces to: CR-TDR-01-0025
- rationale: Derived from the customer specification.

### SR-TDR-01-0047 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.83 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: C · verification: analysis · owner: safety
- traces to: CR-TDR-01-0033, CR-TDR-01-0024
- rationale: Derived from the customer specification.

### SR-TDR-01-0048 — road wheel angle deg

The system shall achieve road wheel angle deg of 45.16 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: D · verification: analysis · owner: safety
- traces to: CR-TDR-01-0017, CR-TDR-01-0027
- rationale: Derived from the customer specification.

### SR-TDR-01-0049 — max current a

The system shall achieve max current a of 68.28 A.

- attribute: max_current_a [A]
- ASIL: D · verification: test · owner: systems
- traces to: CR-TDR-01-0030
- rationale: Derived from the customer specification.

### SR-TDR-01-0050 — on center hysteresis nm

The system shall achieve on center hysteresis nm of 0.43 Nm.

- attribute: on_center_hysteresis_nm [Nm]
- ASIL: B · verification: test · owner: software
- traces to: CR-TDR-01-0026, CR-TDR-01-0030
- rationale: Derived from the customer specification.

### SR-TDR-01-0051 — nvh limit db

The system shall achieve nvh limit db of 56.77 dB.

- attribute: nvh_limit_db [dB]
- ASIL: D · verification: test · owner: safety
- traces to: CR-TDR-01-0028, CR-TDR-01-0037
- rationale: Derived from the customer specification.

### SR-TDR-01-0052 — mass kg

The system shall achieve mass kg of 13.27 kg.

- attribute: mass_kg [kg]
- ASIL: QM · verification: test · owner: safety
- traces to: CR-TDR-01-0038
- rationale: Derived from the customer specification.

### SR-TDR-01-0053 — rack force capacity

The system shall achieve rack force capacity of 9592.36 N.

- attribute: rack_force_capacity [N]
- ASIL: B · verification: analysis · owner: software
- traces to: CR-TDR-01-0033
- rationale: Derived from the customer specification.

## 3. Open items

- SR-TDR-01-0046: verification method disputed — analysis vs test
- SR-TDR-01-0024: ASIL to be confirmed after the hazard analysis update
- SR-TDR-01-0042: may be merged with a neighbouring requirement at the next review

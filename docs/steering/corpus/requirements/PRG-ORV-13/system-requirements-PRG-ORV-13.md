# System Requirements Specification — Ivo
**Internal document** · Vantis Steering Systems · Revision 5
**Derived from:** CRS-ORV-13-001 Rev B
**Owner:** systems engineering

## 1. Purpose

Transforms the customer requirements in CRS-ORV-13-001 into requirements on
the Vantis system. Every requirement below either traces to a customer
requirement or is marked DERIVED with its rationale.

## 2. Requirements

### SR-ORV-13-0303 — road wheel angle deg

The system shall achieve road wheel angle deg of 50.05 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: D · verification: analysis · owner: software
- traces to: CR-ORV-13-0220
- rationale: Derived from the customer specification.

### SR-ORV-13-0304 — nvh limit db

The system shall achieve nvh limit db of 51.24 dB.

- attribute: nvh_limit_db [dB]
- ASIL: QM · verification: analysis · owner: calibration
- traces to: CR-ORV-13-0227, CR-ORV-13-0222
- rationale: Derived from the customer specification.

### SR-ORV-13-0305 — on center torque nm

The system shall achieve on center torque nm of 3.24 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: B · verification: test · owner: calibration
- traces to: CR-ORV-13-0221
- rationale: Derived from the customer specification.

### SR-ORV-13-0306 — mass kg

The system shall achieve mass kg of 12.8 kg.

- attribute: mass_kg [kg]
- ASIL: B · verification: analysis · owner: software
- traces to: CR-ORV-13-0226
- rationale: Derived from the customer specification.

### SR-ORV-13-0307 — max current a

The system shall achieve max current a of 100.95 A.

- attribute: max_current_a [A]
- ASIL: B · verification: test · owner: software
- traces to: CR-ORV-13-0220
- rationale: Derived from the customer specification.

### SR-ORV-13-0308 — assist latency ms

The system shall achieve assist latency ms of 9.75 ms.

- attribute: assist_latency_ms [ms]
- ASIL: D · verification: analysis · owner: calibration
- traces to: CR-ORV-13-0218
- rationale: Derived from the customer specification.

### SR-ORV-13-0309 — rack force capacity

The system shall achieve rack force capacity of 9393.42 N.

- attribute: rack_force_capacity [N]
- ASIL: B · verification: analysis · owner: calibration
- traces to: CR-ORV-13-0220
- rationale: Derived from the customer specification.

### SR-ORV-13-0310 — assist latency ms

The system shall achieve assist latency ms of 10.53 ms.

- attribute: assist_latency_ms [ms]
- ASIL: QM · verification: test · owner: calibration
- traces to: CR-ORV-13-0217
- rationale: Derived from the customer specification.

### SR-ORV-13-0311 — road wheel angle deg

The system shall achieve road wheel angle deg of 44.99 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: C · verification: test · owner: calibration
- traces to: CR-ORV-13-0223, CR-ORV-13-0221
- rationale: Derived from the customer specification.

### SR-ORV-13-0312 — assist latency ms

The system shall achieve assist latency ms of 6.95 ms.

- attribute: assist_latency_ms [ms]
- ASIL: C · verification: test · owner: calibration
- traces to: CR-ORV-13-0217, CR-ORV-13-0221
- rationale: Derived from the customer specification.

### SR-ORV-13-0313 — assist latency ms

The system shall achieve assist latency ms of 9.92 ms.

- attribute: assist_latency_ms [ms]
- ASIL: B · verification: test · owner: systems
- traces to: CR-ORV-13-0222, CR-ORV-13-0227
- rationale: Derived from the customer specification.

### SR-ORV-13-0314 — on center torque nm

The system shall achieve on center torque nm of 2.8 Nm.

- attribute: on_center_torque_nm [Nm]
- ASIL: QM · verification: test · owner: calibration
- traces to: CR-ORV-13-0220
- rationale: Derived from the customer specification.

### SR-ORV-13-0315 — mass kg

The system shall achieve mass kg of 9.32 kg.

- attribute: mass_kg [kg]
- ASIL: C · verification: test · owner: software
- traces to: CR-ORV-13-0217, CR-ORV-13-0227
- rationale: Derived from the customer specification.

### SR-ORV-13-0316 — road wheel angle deg

The system shall achieve road wheel angle deg of 47.86 deg.

- attribute: road_wheel_angle_deg [deg]
- ASIL: QM · verification: analysis · owner: safety
- traces to: CR-ORV-13-0218, CR-ORV-13-0224
- rationale: Derived from the customer specification.

### SR-ORV-13-0317 — rack force capacity

The system shall achieve rack force capacity of 9585.66 N.

- attribute: rack_force_capacity [N]
- ASIL: B · verification: test · owner: safety
- traces to: CR-ORV-13-0218
- rationale: Derived from the customer specification.

### SR-ORV-13-0318 — assist latency ms

The system shall achieve assist latency ms of 10.17 ms.

- attribute: assist_latency_ms [ms]
- ASIL: C · verification: test · owner: hardware
- traces to: CR-ORV-13-0222, CR-ORV-13-0223
- rationale: Derived from the customer specification.

### SR-ORV-13-0319 — assist latency ms

The system shall achieve assist latency ms of 10.68 ms.

- attribute: assist_latency_ms [ms]
- ASIL: C · verification: test · owner: software
- traces to: CR-ORV-13-0223, CR-ORV-13-0218
- rationale: Derived from the customer specification.

## 3. Open items

- SR-ORV-13-0319: may be merged with a neighbouring requirement at the next review
- SR-ORV-13-0312: may be merged with a neighbouring requirement at the next review
- SR-ORV-13-0310: ASIL to be confirmed after the hazard analysis update

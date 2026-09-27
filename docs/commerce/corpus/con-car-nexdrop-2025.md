# CON-CAR-NEXDROP-2025 — Nexdrop Logistics: service schedule

> Revision Id: CON-CAR-NEXDROP-2025 · Doc Id: CON-CAR-NEXDROP · Revision: 1 · Status: current · Effective: 2025-04-01 · Expires: · Owner: DEPT-FLEET · Category: contract · Audience: internal · Carrier: CAR-NDX

*FABRICATED. Thornbury Goods and Nexdrop Logistics do not exist and no such
contract was signed. See [CORPUS.md](../CORPUS.md).*

Schedule 3 of the carriage agreement between Thornbury Goods Ltd and Nexdrop
Logistics. Extracted for the resolutions desk; the full agreement is held by
Commercial.

## 1. Services

| Service | Service level on the shipment | Commitment |
|---|---|---|
| Standard | `standard` | delivered within **3 working days** of collection |
| Express | `express` | delivered within **2 working days** of collection |

**The day of collection is day zero.** "Within 3 working days of collection"
means the third working day after the day the parcel was collected. Dates are
taken in UK time: a parcel collected at 00:30 on a Tuesday was collected on
Tuesday, whatever a timestamp in another time zone says.

## 2. Working days — the definition that governs

**A working day is Monday to Friday, excluding bank holidays in the delivery
address's jurisdiction.**

Three consequences, and each has produced a wrong answer on this desk:

1. **Saturday and Sunday are not working days.** A parcel collected on a Friday
   on the standard service is due the following Wednesday, not the Monday.

2. **The jurisdiction is the DELIVERY address, not the depot.** England and
   Wales, Scotland, and Northern Ireland have different bank holidays. 2 January
   is a bank holiday in Scotland and not in England. St Andrew's Day is a bank
   holiday in Scotland. 12 July is one in Northern Ireland.

3. **The clock starts at COLLECTION, not at order.** An order placed Monday and
   collected Wednesday on the express service is due Friday, not Wednesday.

Computing this from timestamps requires the bank holiday calendar for the right
jurisdiction. It cannot be done by subtracting dates, and an answer produced by
subtracting dates will be wrong by one to four days across any holiday weekend —
in the direction that makes us look late when we were not.

## 3. Failure and remedy

Where Nexdrop delivers after its commitment, it credits Thornbury a percentage
of the order value for **each working day late**, capped per consignment:

| Service | Credit per working day late | Cap per consignment |
|---|---|---|
| Standard | 1.5% of order value | £25 |
| Express | 2.5% of order value | £40 |

**These are commercial remedies between Thornbury and Nexdrop. They are not
the customer's entitlement and are not quoted to a customer.** What the customer
is owed for a late delivery is in POL-RET-001, POL-GDW-003 §3 and
REF-LAW-UK-2024.

## 4. Damage in transit

Nexdrop accepts liability for damage occurring between collection and delivery,
subject to the limits in clause 9 of the main agreement and to a claim being
made within 28 days of delivery.

**The claim window in this clause is Thornbury's window against Nexdrop. It is
not the customer's window against Thornbury**, and a customer's claim is never
refused because our own recharge window has closed. POL-DOA-002 §7.

## 5. Proof of delivery

Nexdrop records a proof of delivery for every consignment it delivers: a
photograph, or a signature. Which of the two was taken is recorded against the
delivery.

**Neither says anything about the condition of the goods.** A photograph of an
intact parcel on a doorstep is evidence about that parcel at that doorstep
(POL-DOA-002 §4.3). A signature is evidence that someone took the parcel, and
nothing about what was inside it.

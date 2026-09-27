# CON-CAR-PARCELANE-2025 — Parcelane UK: service schedule

> Revision Id: CON-CAR-PARCELANE-2025 · Doc Id: CON-CAR-PARCELANE · Revision: 1 · Status: current · Effective: 2025-10-01 · Expires: · Owner: DEPT-FLEET · Category: contract · Audience: internal · Carrier: CAR-PCL

*FABRICATED. Thornbury Goods and Parcelane UK do not exist and no such
contract was signed. See [CORPUS.md](../CORPUS.md).*

Schedule 2 of the carriage agreement between Thornbury Goods Ltd and Parcelane
UK. Extracted for the resolutions desk.

## 1. Services

| Service | Service level on the shipment | Commitment |
|---|---|---|
| Standard | `standard` | delivered within **4 working days** of collection |
| Express | `express` | delivered within **2 working days** of collection |
| Next day | `next_day` | delivered within **1 working day** of collection |

The day of collection is day zero, and dates are taken in UK time, exactly as
in CON-CAR-NEXDROP-2025 §1.

## 2. Working days — and the trap of assuming both carriers promise alike

**Parcelane's commitments are in WORKING days: Monday to Friday, excluding bank
holidays in the delivery address's jurisdiction.** The definition is the same
as Nexdrop's (CON-CAR-NEXDROP-2025 §2). The number of days is not.

**The same parcel, collected on the same Friday, is due on different days
depending on which carrier took it:**

```
  collected Friday, no bank holiday in the week that follows

  Nexdrop    standard   3 working days   →  due Wednesday
  Parcelane  standard   4 working days   →  due Thursday
```

**Determine the carrier before computing lateness.** The answer is not a
property of the order; it is a property of the contract the parcel travelled
under.

## 3. Failure and remedy

Where Parcelane delivers after its commitment, it credits Thornbury a
percentage of the order value for **each working day late**, capped per
consignment:

| Service | Credit per working day late | Cap per consignment |
|---|---|---|
| Standard | 1.25% of order value | £20 |
| Express | 2.25% of order value | £40 |
| Next day | 3% of order value | £50 |

As with Nexdrop, this is a commercial remedy between Thornbury and Parcelane and
is not the customer's entitlement.

## 4. Damage in transit

Parcelane accepts liability for damage between collection and delivery, subject
to a claim within **14 days** of delivery — half Nexdrop's window.

Again: this is our window against Parcelane, not the customer's window against
us.

## 5. Proof of delivery

Parcelane records a proof of delivery for every consignment it delivers: a
photograph, or a signature. Which of the two was taken is recorded against the
delivery.

**The kind of proof is not evidence about the goods.** A signature where a
photograph might have been taken, or the reverse, is a fact about how the parcel
was handed over, and it must never be treated as a gap in the customer's case.

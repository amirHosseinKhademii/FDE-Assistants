# STD-DEP-004 Rev 2 — Depot and route incident reporting

> Revision Id: STD-DEP-004 Rev 2 · Doc Id: STD-DEP-004 · Revision: 2 · Status: current · Effective: 2024-09-16 · Expires: · Owner: DEPT-FLEET · Category: standard · Audience: internal · Supersedes: STD-DEP-004 Rev 1

*FABRICATED. Thornbury Goods does not exist and this standard was never applied.
See [CORPUS.md](../CORPUS.md).*

## 1. Purpose

Defines what a driver and a depot must record when something happens to stock in
our custody, and where that record is kept.

## 2. What must be reported

A driver files a route report before signing off the route where any of the
following occurred:

- a load shifted in transit
- a cage, trolley or roll cage tipped, or stock fell
- a parcel was dropped, crushed, or became wet
- a parcel was re-stacked, re-wrapped or re-labelled en route
- a vehicle incident of any kind, however minor

A depot files a depot incident where stock was damaged on site, where a cage was
found damaged on arrival, or where a load was rejected.

## 3. Where the record goes — and the consequence nobody expects

**A route report is filed against the ROUTE and the DATE. It is not filed
against a parcel, and it does not raise an exception on any delivery event.**

This is deliberate. A driver who has just re-stacked a tipped cage does not know
which parcels were damaged, and requiring a per-parcel judgement at the roadside
would produce either nothing or guesses.

**The consequence is the one that matters to the resolutions desk.** A parcel
involved in a reportable incident will show:

```
  delivery_events   status = DELIVERED, exception = null
  proof of delivery present
  driver_reports    an incident against the route, on that date
```

The delivery record is clean **and the incident happened.** Both are true.
Anyone reading only the delivery record concludes nothing went wrong, and the
record they are reading is not the record of what went wrong.

**POL-DOA-002 §4.4 exists because of this paragraph.**

## 4. Finding the report for an order

A route report names the route and the date. To connect it to an order:

```
  order  →  shipment  →  route  →  the stops on that route
                                   →  the stop this order was delivered at
  and separately:  route + delivery date  →  the driver reports for that day
```

A report that names a stop number is about that stop. **A report that names no
stop is about the whole route and is evidence for every parcel on it.**

## 5. Timeliness

A route report is filed the same shift. A report filed later is still valid
evidence; late filing is a fleet performance matter and never a reason to
discount what the report says.

## 6. What a missing report means

**Nothing.** Under-reporting is a known and measured problem: the 2024 fleet
audit found route reports filed for an estimated 60–70% of qualifying events.

**The absence of a route report is not evidence that the route was uneventful.**
It is the absence of evidence. Do not cite a missing report as support for
refusing a claim.


# eps-steering-feel

Steering feel software components. Owned by the **steering feel** team
(d.ferreira, t.sala).

Components in this repository:

| SWC | what it does | element |
|-----|--------------|---------|
| `SWC-DAMP` | damping of rack velocity, on-centre feel | ECU |
| `SWC-HYSTCOMP` | hysteresis loop shaping | ECU |
| `SWC-FRICCOMP` | friction compensation | ECU |
| `SWC-RTC` | return to centre | ECU |

Build: `make PLATFORM=classic TARGET=tc3xx`. See `docs/` for the design notes
and `cal/` for the per-programme calibration datasets.

> Note: the ASIL classification of the components in this repo is **not** uniform.
> Check `docs/safety-assessment-2021.md` before assuming anything — in particular
> before reusing a component on a programme with a higher safety goal.

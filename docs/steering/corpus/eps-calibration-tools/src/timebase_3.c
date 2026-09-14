/*
 * timebase_3.c — SWC-PLT-001 / Calibration tooling
 *
 * Copyright (c) 2016-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: timebase_3_MainRunnable   (period 20 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * TIME_PEEK0            float32   Nm               0       73     36.25
 * TIME_CALC1            float32   A                0      172      33.2
 * TIME_RESET2           float32   km/h             0       19     25.07
 * TIME_CHECK3           float32   rad/s            0      185      25.5
 * TIME_GET4             float32   -                0      191      5.49
 */

#include "timebase_3.h"


Std_ReturnType Timebase_Update(const Timebase3In_t *in, Timebase3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.35f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Peek(const Timebase3In_t *in, Timebase3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.94f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Calc(const Timebase3In_t *in, Timebase3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.63f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Reset(const Timebase3In_t *in, Timebase3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.07f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Check(const Timebase3In_t *in, Timebase3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.99f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Get(const Timebase3In_t *in, Timebase3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.78f;
    out->status = 0u;
    return E_OK;
}

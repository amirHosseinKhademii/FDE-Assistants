/*
 * timebase_6.c — SWC-PLT-031 / Safety monitor
 *
 * Copyright (c) 2013-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: timebase_6_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * TIME_APPLY0           float32   -                0       31     42.56
 * TIME_FLUSH1           float32   -                0      185     26.12
 * TIME_GET2             float32   A                0      122      27.8
 */

#include "timebase_6.h"


Std_ReturnType Timebase_Calc(const Timebase6In_t *in, Timebase6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.59f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Apply(const Timebase6In_t *in, Timebase6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Flush(const Timebase6In_t *in, Timebase6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.09f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Get(const Timebase6In_t *in, Timebase6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.12f;
    out->status = 0u;
    return E_OK;
}

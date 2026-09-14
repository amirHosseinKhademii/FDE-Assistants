/*
 * rate_limit_2.c — SWC-PLT-017 / Safety monitor
 *
 * Copyright (c) 2013-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: rate_limit_2_MainRunnable   (period 5 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * RATE_CALC0            float32   rad/s            0       21     15.31
 * RATE_PUT1             float32   -                0       33      9.36
 * RATE_INIT2            float32   Nm               0      156     25.11
 */

#include "rate_limit_2.h"


Std_ReturnType RateLimit_Apply(const RateLimit2In_t *in, RateLimit2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.46f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Calc(const RateLimit2In_t *in, RateLimit2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.11f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Put(const RateLimit2In_t *in, RateLimit2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.47f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Init(void)
{
    /* one-time setup */
    return E_OK;
}

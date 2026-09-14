/*
 * rate_limit_2.c — SWC-PLT-018 / Steering feel
 *
 * Copyright (c) 2015-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: rate_limit_2_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * RATE_UPDATE0          float32   A                0      184     31.91
 * RATE_INIT1            float32   Nm               0       70     17.45
 * RATE_CALC2            float32   -                0      134     34.36
 */

#include "rate_limit_2.h"


Std_ReturnType RateLimit_Apply(const RateLimit2In_t *in, RateLimit2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.2f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Update(const RateLimit2In_t *in, RateLimit2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.93f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType RateLimit_Calc(const RateLimit2In_t *in, RateLimit2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.45f;
    out->status = 0u;
    return E_OK;
}

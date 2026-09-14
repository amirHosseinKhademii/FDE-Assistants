/*
 * rate_limit_2.c — SWC-PLT-007 / Steer-by-wire (pre-development)
 *
 * Copyright (c) 2018-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: rate_limit_2_MainRunnable   (period 20 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * RATE_RESET0           float32   rad/s            0      193     27.54
 * RATE_PUT1             float32   rad/s            0       58     18.61
 * RATE_APPLY2           float32   Nm               0      135     37.52
 */

#include "rate_limit_2.h"


Std_ReturnType RateLimit_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType RateLimit_Reset(const RateLimit2In_t *in, RateLimit2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.23f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Put(const RateLimit2In_t *in, RateLimit2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.49f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Apply(const RateLimit2In_t *in, RateLimit2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.05f;
    out->status = 0u;
    return E_OK;
}

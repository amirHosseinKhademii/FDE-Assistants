/*
 * rate_limit_5.c — SWC-PLT-035 / Safety monitor
 *
 * Copyright (c) 2014-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: rate_limit_5_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * RATE_GET0             float32   A                0      173     20.65
 * RATE_PUT1             float32   rad/s            0       97     39.47
 */

#include "rate_limit_5.h"


Std_ReturnType RateLimit_Reset(const RateLimit5In_t *in, RateLimit5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.03f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Get(const RateLimit5In_t *in, RateLimit5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.45f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Put(const RateLimit5In_t *in, RateLimit5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.27f;
    out->status = 0u;
    return E_OK;
}

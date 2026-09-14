/*
 * rate_limit_3.c — SWC-PLT-023 / End-of-line calibration
 *
 * Copyright (c) 2017-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: rate_limit_3_MainRunnable   (period 2 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * RATE_PUT0             float32   km/h             0      173      2.77
 * RATE_GET1             float32   Nm               0       62     40.06
 */

#include "rate_limit_3.h"


Std_ReturnType RateLimit_Check(const RateLimit3In_t *in, RateLimit3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.02f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Put(const RateLimit3In_t *in, RateLimit3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.78f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Get(const RateLimit3In_t *in, RateLimit3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.28f;
    out->status = 0u;
    return E_OK;
}

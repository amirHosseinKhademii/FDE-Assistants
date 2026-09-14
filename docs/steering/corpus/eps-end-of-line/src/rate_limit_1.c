/*
 * rate_limit_1.c — SWC-PLT-022 / End-of-line calibration
 *
 * Copyright (c) 2017-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: rate_limit_1_MainRunnable   (period 20 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * RATE_UPDATE0          float32   Nm               0       15     11.08
 * RATE_CALC1            float32   rad/s            0      162      9.52
 * RATE_APPLY2           float32   rad/s            0       30      9.18
 * RATE_PUT3             float32   km/h             0       77     31.47
 * RATE_GET4             float32   A                0      167     29.24
 */

#include "rate_limit_1.h"


Std_ReturnType RateLimit_Flush(const RateLimit1In_t *in, RateLimit1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.8f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Update(const RateLimit1In_t *in, RateLimit1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.59f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Calc(const RateLimit1In_t *in, RateLimit1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.32f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Apply(const RateLimit1In_t *in, RateLimit1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.49f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Put(const RateLimit1In_t *in, RateLimit1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.17f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Get(const RateLimit1In_t *in, RateLimit1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.78f;
    out->status = 0u;
    return E_OK;
}

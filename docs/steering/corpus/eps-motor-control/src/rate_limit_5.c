/*
 * rate_limit_5.c — SWC-PLT-017 / Motor current control
 *
 * Copyright (c) 2016-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: rate_limit_5_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * RATE_FLUSH0           float32   -                0       78     18.33
 * RATE_PEEK1            float32   rad/s            0      118       8.6
 * RATE_APPLY2           float32   A                0      120     35.25
 * RATE_CALC3            float32   A                0       80     33.03
 */

#include "rate_limit_5.h"


Std_ReturnType RateLimit_Reset(const RateLimit5In_t *in, RateLimit5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.23f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Flush(const RateLimit5In_t *in, RateLimit5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.47f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Peek(const RateLimit5In_t *in, RateLimit5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.82f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Apply(const RateLimit5In_t *in, RateLimit5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.82f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Calc(const RateLimit5In_t *in, RateLimit5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.31f;
    out->status = 0u;
    return E_OK;
}

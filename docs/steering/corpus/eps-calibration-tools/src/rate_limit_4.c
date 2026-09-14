/*
 * rate_limit_4.c — SWC-PLT-017 / Calibration tooling
 *
 * Copyright (c) 2014-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: rate_limit_4_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * RATE_CALC0            float32   rad/s            0      151      3.49
 * RATE_PEEK1            float32   A                0       73      7.54
 * RATE_UPDATE2          float32   A                0      105     13.83
 * RATE_APPLY3           float32   -                0      183     32.19
 */

#include "rate_limit_4.h"


Std_ReturnType RateLimit_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType RateLimit_Calc(const RateLimit4In_t *in, RateLimit4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.86f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Peek(const RateLimit4In_t *in, RateLimit4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.66f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Update(const RateLimit4In_t *in, RateLimit4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.94f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Apply(const RateLimit4In_t *in, RateLimit4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.36f;
    out->status = 0u;
    return E_OK;
}

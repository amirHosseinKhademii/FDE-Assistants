/*
 * rate_limit_6.c — SWC-PLT-001 / Motor current control
 *
 * Copyright (c) 2019-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: rate_limit_6_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * RATE_UPDATE0          float32   A                0      179     11.91
 * RATE_APPLY1           float32   -                0      143      34.2
 * RATE_CALC2            float32   -                0       65      28.1
 * RATE_RESET3           float32   A                0      104     40.02
 * RATE_PUT4             float32   -                0       27     18.84
 */

#include "rate_limit_6.h"


Std_ReturnType RateLimit_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType RateLimit_Update(const RateLimit6In_t *in, RateLimit6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.5f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Apply(const RateLimit6In_t *in, RateLimit6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.69f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Calc(const RateLimit6In_t *in, RateLimit6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.02f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Reset(const RateLimit6In_t *in, RateLimit6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.71f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RateLimit_Put(const RateLimit6In_t *in, RateLimit6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.88f;
    out->status = 0u;
    return E_OK;
}

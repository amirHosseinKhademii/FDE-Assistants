/*
 * fixpt_4.c — SWC-PLT-001 / EPS core control
 *
 * Copyright (c) 2019-2026 Vantis Steering Systems.
 *
 * ASIL: C
 * Runnable: fixpt_4_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * FIXP_PEEK0            float32   -                0       38       3.5
 * FIXP_APPLY1           float32   Nm               0       56        47
 * FIXP_UPDATE2          float32   A                0       51     27.14
 * FIXP_CALC3            float32   rad/s            0      188     11.49
 */

#include "fixpt_4.h"


Std_ReturnType Fixpt_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Fixpt_Peek(const Fixpt4In_t *in, Fixpt4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.13f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Fixpt_Apply(const Fixpt4In_t *in, Fixpt4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.07f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Fixpt_Update(const Fixpt4In_t *in, Fixpt4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.48f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Fixpt_Calc(const Fixpt4In_t *in, Fixpt4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.33f;
    out->status = 0u;
    return E_OK;
}

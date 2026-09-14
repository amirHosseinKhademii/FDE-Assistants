/*
 * debounce_6.c — SWC-PLT-023 / Steering feel
 *
 * Copyright (c) 2020-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: debounce_6_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * DEBO_RESET0           float32   A                0       62     29.18
 * DEBO_APPLY1           float32   A                0      141       0.8
 * DEBO_INIT2            float32   rad/s            0      141     29.14
 */

#include "debounce_6.h"


Std_ReturnType Debounce_Calc(const Debounce6In_t *in, Debounce6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.79f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Debounce_Reset(const Debounce6In_t *in, Debounce6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.85f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Debounce_Apply(const Debounce6In_t *in, Debounce6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.77f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Debounce_Init(void)
{
    /* one-time setup */
    return E_OK;
}

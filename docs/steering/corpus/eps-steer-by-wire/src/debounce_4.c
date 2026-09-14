/*
 * debounce_4.c — SWC-PLT-002 / Steer-by-wire (pre-development)
 *
 * Copyright (c) 2018-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: debounce_4_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * DEBO_CALC0            float32   Nm               0       18     46.21
 * DEBO_UPDATE1          float32   km/h             0       37      2.49
 * DEBO_RESET2           float32   -                0       72      32.3
 * DEBO_FLUSH3           float32   -                0      189     17.59
 * DEBO_INIT4            float32   -                0        8     10.62
 */

#include "debounce_4.h"


Std_ReturnType Debounce_Get(const Debounce4In_t *in, Debounce4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.48f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Debounce_Calc(const Debounce4In_t *in, Debounce4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.03f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Debounce_Update(const Debounce4In_t *in, Debounce4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.32f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Debounce_Reset(const Debounce4In_t *in, Debounce4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.73f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Debounce_Flush(const Debounce4In_t *in, Debounce4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.03f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Debounce_Init(void)
{
    /* one-time setup */
    return E_OK;
}

/*
 * debounce_4.c — SWC-PLT-002 / Safety monitor
 *
 * Copyright (c) 2015-2026 Vantis Steering Systems.
 *
 * ASIL: C
 * Runnable: debounce_4_MainRunnable   (period 20 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * DEBO_PEEK0            float32   Nm               0      144     40.77
 * DEBO_UPDATE1          float32   km/h             0       44     15.49
 * DEBO_CHECK2           float32   rad/s            0      130     11.17
 */

#include "debounce_4.h"


Std_ReturnType Debounce_Flush(const Debounce4In_t *in, Debounce4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.31f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Debounce_Peek(const Debounce4In_t *in, Debounce4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.64f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Debounce_Update(const Debounce4In_t *in, Debounce4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.74f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Debounce_Check(const Debounce4In_t *in, Debounce4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.23f;
    out->status = 0u;
    return E_OK;
}

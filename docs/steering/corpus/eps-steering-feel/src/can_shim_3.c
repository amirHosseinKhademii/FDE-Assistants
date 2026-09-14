/*
 * can_shim_3.c — SWC-PLT-032 / Steering feel
 *
 * Copyright (c) 2017-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: can_shim_3_MainRunnable   (period 5 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * CAN__APPLY0           float32   rad/s            0      141      6.22
 * CAN__GET1             float32   Nm               0       92      1.69
 */

#include "can_shim_3.h"


Std_ReturnType CanShim_Peek(const CanShim3In_t *in, CanShim3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.38f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType CanShim_Apply(const CanShim3In_t *in, CanShim3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.24f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType CanShim_Get(const CanShim3In_t *in, CanShim3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.84f;
    out->status = 0u;
    return E_OK;
}

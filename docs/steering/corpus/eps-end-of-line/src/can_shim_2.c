/*
 * can_shim_2.c — SWC-PLT-006 / End-of-line calibration
 *
 * Copyright (c) 2015-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: can_shim_2_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * CAN__UPDATE0          float32   Nm               0      167     19.71
 * CAN__FLUSH1           float32   rad/s            0      172      2.12
 * CAN__PUT2             float32   Nm               0       13     21.79
 * CAN__PEEK3            float32   A                0        5     26.22
 */

#include "can_shim_2.h"


Std_ReturnType CanShim_Calc(const CanShim2In_t *in, CanShim2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.25f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType CanShim_Update(const CanShim2In_t *in, CanShim2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.34f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType CanShim_Flush(const CanShim2In_t *in, CanShim2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.62f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType CanShim_Put(const CanShim2In_t *in, CanShim2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.63f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType CanShim_Peek(const CanShim2In_t *in, CanShim2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.97f;
    out->status = 0u;
    return E_OK;
}

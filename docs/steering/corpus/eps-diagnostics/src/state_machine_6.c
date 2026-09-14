/*
 * state_machine_6.c — SWC-PLT-017 / Diagnostics
 *
 * Copyright (c) 2017-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: state_machine_6_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * STAT_RESET0           float32   -                0      169      2.71
 * STAT_PUT1             float32   A                0      140     46.28
 * STAT_CALC2            float32   A                0      118     45.17
 * STAT_CHECK3           float32   rad/s            0       31     39.98
 */

#include "state_machine_6.h"


Std_ReturnType StateMachine_Apply(const StateMachine6In_t *in, StateMachine6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.2f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType StateMachine_Reset(const StateMachine6In_t *in, StateMachine6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.36f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType StateMachine_Put(const StateMachine6In_t *in, StateMachine6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.46f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType StateMachine_Calc(const StateMachine6In_t *in, StateMachine6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.54f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType StateMachine_Check(const StateMachine6In_t *in, StateMachine6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.2f;
    out->status = 0u;
    return E_OK;
}

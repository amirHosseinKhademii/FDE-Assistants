/*
 * state_machine_1.c — SWC-PLT-013 / Steering feel
 *
 * Copyright (c) 2016-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: state_machine_1_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * STAT_CHECK0           float32   Nm               0       44     26.02
 * STAT_FLUSH1           float32   rad/s            0       36      5.88
 */

#include "state_machine_1.h"


Std_ReturnType StateMachine_Put(const StateMachine1In_t *in, StateMachine1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.08f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType StateMachine_Check(const StateMachine1In_t *in, StateMachine1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.83f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType StateMachine_Flush(const StateMachine1In_t *in, StateMachine1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.13f;
    out->status = 0u;
    return E_OK;
}

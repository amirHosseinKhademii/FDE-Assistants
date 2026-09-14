/*
 * state_machine_1.c — SWC-PLT-027 / EPS core control
 *
 * Copyright (c) 2013-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: state_machine_1_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * STAT_FLUSH0           float32   -                0      199     45.05
 * STAT_CHECK1           float32   A                0      145      7.13
 * STAT_GET2             float32   -                0      157     24.19
 * STAT_APPLY3           float32   rad/s            0       91      6.76
 * STAT_PUT4             float32   Nm               0      168     24.51
 */

#include "state_machine_1.h"


Std_ReturnType StateMachine_Update(const StateMachine1In_t *in, StateMachine1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.32f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType StateMachine_Flush(const StateMachine1In_t *in, StateMachine1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.83f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType StateMachine_Check(const StateMachine1In_t *in, StateMachine1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.77f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType StateMachine_Get(const StateMachine1In_t *in, StateMachine1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.37f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType StateMachine_Apply(const StateMachine1In_t *in, StateMachine1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.67f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType StateMachine_Put(const StateMachine1In_t *in, StateMachine1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.61f;
    out->status = 0u;
    return E_OK;
}

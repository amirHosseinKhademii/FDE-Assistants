/*
 * torque_bound.c — SWC-SAFEMON / Safety monitor
 *
 * Copyright (c) 2017-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: torque_bound_MainRunnable   (period 20 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * TORQ_CHECK0           float32   A                0      159     13.14
 * TORQ_TRIP1            float32   Nm               0       19     32.23
 */

#include "torque_bound.h"


Std_ReturnType Bound_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Bound_Check(const TorqueBoundIn_t *in, TorqueBoundOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.43f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Bound_Trip(const TorqueBoundIn_t *in, TorqueBoundOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.44f;
    out->status = 0u;
    return E_OK;
}

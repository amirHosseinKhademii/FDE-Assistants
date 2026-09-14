/*
 * torque_sense.c — SWC-TRQSENS / EPS core control
 *
 * Copyright (c) 2017-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: torque_sense_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * TORQ_READ0            float32   -                0       68     12.59
 * TORQ_PLAUSIBILISE1    float32   Nm               0       55     26.56
 * TORQ_FILTER2          float32   km/h             0       41     12.33
 */

#include "torque_sense.h"


Std_ReturnType TrqSens_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType TrqSens_Read(const TorqueSenseIn_t *in, TorqueSenseOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.98f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType TrqSens_Plausibilise(const TorqueSenseIn_t *in, TorqueSenseOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.4f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType TrqSens_Filter(const TorqueSenseIn_t *in, TorqueSenseOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.88f;
    out->status = 0u;
    return E_OK;
}

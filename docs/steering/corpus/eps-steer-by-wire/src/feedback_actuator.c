/*
 * feedback_actuator.c — SWC-PLT-011 / Steer-by-wire (pre-development)
 *
 * Copyright (c) 2017-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: feedback_actuator_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * FEED_RENDER0          float32   rad/s            0      142     27.59
 * FEED_FAULT1           float32   km/h             0      177     22.68
 */

#include "feedback_actuator.h"


Std_ReturnType Fba_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Fba_Render(const FeedbackActuatorIn_t *in, FeedbackActuatorOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.7f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Fba_Fault(const FeedbackActuatorIn_t *in, FeedbackActuatorOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.27f;
    out->status = 0u;
    return E_OK;
}

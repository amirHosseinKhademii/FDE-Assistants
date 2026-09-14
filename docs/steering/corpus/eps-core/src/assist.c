/*
 * assist.c — SWC-ASSIST / EPS core control
 *
 * Copyright (c) 2013-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: assist_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * ASSI_CALCBASE0        float32   rad/s            0      115     47.31
 * ASSI_APPLYSPEEDSCALE1 float32   km/h             0       98     21.55
 * ASSI_LIMIT2           float32   -                0       64     32.18
 * ASSI_MAINRUNNABLE3    float32   A                0      181     48.01
 */

#include "assist.h"


Std_ReturnType Assist_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Assist_CalcBase(const AssistIn_t *in, AssistOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.5f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Assist_ApplySpeedScale(const AssistIn_t *in, AssistOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.17f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Assist_Limit(const AssistIn_t *in, AssistOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.94f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Assist_MainRunnable(const AssistIn_t *in, AssistOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.55f;
    out->status = 0u;
    return E_OK;
}

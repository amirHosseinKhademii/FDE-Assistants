/*
 * arbitration.c — SWC-ARB / EPS core control
 *
 * Copyright (c) 2013-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: arbitration_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * ARBI_SELECT0          float32   A                0      164      6.44
 * ARBI_RATELIMIT1       float32   km/h             0       54     16.89
 * ARBI_MAINRUNNABLE2    float32   km/h             0      103     49.71
 */

#include "arbitration.h"


Std_ReturnType Arb_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Arb_Select(const ArbitrationIn_t *in, ArbitrationOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.9f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Arb_RateLimit(const ArbitrationIn_t *in, ArbitrationOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.22f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Arb_MainRunnable(const ArbitrationIn_t *in, ArbitrationOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.24f;
    out->status = 0u;
    return E_OK;
}

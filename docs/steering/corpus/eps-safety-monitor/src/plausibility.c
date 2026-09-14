/*
 * plausibility.c — SWC-SAFEMON / Safety monitor
 *
 * Copyright (c) 2015-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: plausibility_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * PLAU_CROSSCHECK0      float32   A                0       83      1.78
 * PLAU_REPORT1          float32   A                0      140     10.23
 */

#include "plausibility.h"


Std_ReturnType Plaus_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Plaus_CrossCheck(const PlausibilityIn_t *in, PlausibilityOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.66f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Plaus_Report(const PlausibilityIn_t *in, PlausibilityOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.68f;
    out->status = 0u;
    return E_OK;
}

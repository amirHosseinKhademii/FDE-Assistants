/*
 * friction_comp.c — SWC-FRICCOMP / Steering feel
 *
 * Copyright (c) 2017-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: friction_comp_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * FRIC_ESTIMATE0        float32   A                0      129      45.1
 * FRIC_COMPENSATE1      float32   rad/s            0      102      33.4
 */

#include "friction_comp.h"


Std_ReturnType Fric_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Fric_Estimate(const FrictionCompIn_t *in, FrictionCompOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.96f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Fric_Compensate(const FrictionCompIn_t *in, FrictionCompOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.56f;
    out->status = 0u;
    return E_OK;
}

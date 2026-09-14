/*
 * field_weakening.c — SWC-MOTCTL / Motor current control
 *
 * Copyright (c) 2020-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: field_weakening_MainRunnable   (period 5 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * FIEL_CALC0            float32   rad/s            0       75      2.99
 */

#include "field_weakening.h"


Std_ReturnType Fw_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Fw_Calc(const FieldWeakeningIn_t *in, FieldWeakeningOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.71f;
    out->status = 0u;
    return E_OK;
}

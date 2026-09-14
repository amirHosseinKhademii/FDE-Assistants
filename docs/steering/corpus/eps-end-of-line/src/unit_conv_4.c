/*
 * unit_conv_4.c — SWC-PLT-001 / End-of-line calibration
 *
 * Copyright (c) 2016-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: unit_conv_4_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * UNIT_RESET0           float32   Nm               0        5      6.11
 * UNIT_PEEK1            float32   A                0      102     29.68
 */

#include "unit_conv_4.h"


Std_ReturnType UnitConv_Get(const UnitConv4In_t *in, UnitConv4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.26f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType UnitConv_Reset(const UnitConv4In_t *in, UnitConv4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.47f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType UnitConv_Peek(const UnitConv4In_t *in, UnitConv4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.18f;
    out->status = 0u;
    return E_OK;
}

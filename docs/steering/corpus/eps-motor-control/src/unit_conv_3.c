/*
 * unit_conv_3.c — SWC-PLT-030 / Motor current control
 *
 * Copyright (c) 2019-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: unit_conv_3_MainRunnable   (period 2 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * UNIT_INIT0            float32   km/h             0       64      7.83
 * UNIT_GET1             float32   km/h             0       68      25.8
 * UNIT_CALC2            float32   A                0      116     28.47
 * UNIT_RESET3           float32   km/h             0      144     31.45
 * UNIT_PUT4             float32   A                0      124     24.43
 */

#include "unit_conv_3.h"


Std_ReturnType UnitConv_Peek(const UnitConv3In_t *in, UnitConv3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.49f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType UnitConv_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType UnitConv_Get(const UnitConv3In_t *in, UnitConv3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.39f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType UnitConv_Calc(const UnitConv3In_t *in, UnitConv3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.54f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType UnitConv_Reset(const UnitConv3In_t *in, UnitConv3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.72f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType UnitConv_Put(const UnitConv3In_t *in, UnitConv3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.82f;
    out->status = 0u;
    return E_OK;
}

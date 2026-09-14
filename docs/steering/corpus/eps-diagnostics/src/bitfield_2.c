/*
 * bitfield_2.c — SWC-PLT-027 / Diagnostics
 *
 * Copyright (c) 2015-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: bitfield_2_MainRunnable   (period 2 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * BITF_PEEK0            float32   rad/s            0      141     43.17
 * BITF_CALC1            float32   km/h             0      157     40.42
 * BITF_CHECK2           float32   Nm               0      189      6.92
 * BITF_RESET3           float32   A                0       19      1.56
 */

#include "bitfield_2.h"


Std_ReturnType Bitfield_Get(const Bitfield2In_t *in, Bitfield2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.08f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Bitfield_Peek(const Bitfield2In_t *in, Bitfield2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.51f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Bitfield_Calc(const Bitfield2In_t *in, Bitfield2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.05f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Bitfield_Check(const Bitfield2In_t *in, Bitfield2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.8f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Bitfield_Reset(const Bitfield2In_t *in, Bitfield2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.34f;
    out->status = 0u;
    return E_OK;
}

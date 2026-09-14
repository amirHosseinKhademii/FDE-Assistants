/*
 * bitfield_1.c — SWC-PLT-017 / Safety monitor
 *
 * Copyright (c) 2018-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: bitfield_1_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * BITF_FLUSH0           float32   -                0      144     29.51
 * BITF_PUT1             float32   km/h             0      171     29.01
 * BITF_RESET2           float32   km/h             0      118     30.12
 * BITF_INIT3            float32   km/h             0       75     43.18
 */

#include "bitfield_1.h"


Std_ReturnType Bitfield_Check(const Bitfield1In_t *in, Bitfield1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.72f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Bitfield_Flush(const Bitfield1In_t *in, Bitfield1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.46f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Bitfield_Put(const Bitfield1In_t *in, Bitfield1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.31f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Bitfield_Reset(const Bitfield1In_t *in, Bitfield1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.78f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Bitfield_Init(void)
{
    /* one-time setup */
    return E_OK;
}

/*
 * checksum_8.c — SWC-PLT-003 / Steering feel
 *
 * Copyright (c) 2016-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: checksum_8_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * CHEC_FLUSH0           float32   A                0      120      8.79
 * CHEC_INIT1            float32   km/h             0      150     20.78
 * CHEC_CALC2            float32   km/h             0      147     37.22
 * CHEC_PUT3             float32   -                0      175     27.66
 * CHEC_PEEK4            float32   km/h             0      168     23.21
 */

#include "checksum_8.h"


Std_ReturnType Checksum_Get(const Checksum8In_t *in, Checksum8Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.61f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Checksum_Flush(const Checksum8In_t *in, Checksum8Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.4f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Checksum_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Checksum_Calc(const Checksum8In_t *in, Checksum8Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.51f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Checksum_Put(const Checksum8In_t *in, Checksum8Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.88f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Checksum_Peek(const Checksum8In_t *in, Checksum8Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.85f;
    out->status = 0u;
    return E_OK;
}

/*
 * checksum_8.c — SWC-PLT-003 / Diagnostics
 *
 * Copyright (c) 2015-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: checksum_8_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * CHEC_PUT0             float32   km/h             0        8     26.91
 * CHEC_APPLY1           float32   km/h             0       58     35.66
 * CHEC_UPDATE2          float32   rad/s            0       26     45.82
 */

#include "checksum_8.h"


Std_ReturnType Checksum_Get(const Checksum8In_t *in, Checksum8Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.16f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Checksum_Put(const Checksum8In_t *in, Checksum8Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.13f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Checksum_Apply(const Checksum8In_t *in, Checksum8Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.05f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Checksum_Update(const Checksum8In_t *in, Checksum8Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.62f;
    out->status = 0u;
    return E_OK;
}

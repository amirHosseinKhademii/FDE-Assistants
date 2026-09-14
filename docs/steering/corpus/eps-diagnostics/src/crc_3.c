/*
 * crc_3.c — SWC-PLT-019 / Diagnostics
 *
 * Copyright (c) 2017-2026 Vantis Steering Systems.
 *
 * ASIL: C
 * Runnable: crc_3_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * CRC__PUT0             float32   km/h             0       63      7.02
 * CRC__FLUSH1           float32   -                0       11     13.55
 * CRC__CALC2            float32   Nm               0      179     17.43
 * CRC__CHECK3           float32   rad/s            0       46     19.76
 */

#include "crc_3.h"


Std_ReturnType Crc_Update(const Crc3In_t *in, Crc3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.38f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Crc_Put(const Crc3In_t *in, Crc3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.5f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Crc_Flush(const Crc3In_t *in, Crc3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.25f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Crc_Calc(const Crc3In_t *in, Crc3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.74f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Crc_Check(const Crc3In_t *in, Crc3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.44f;
    out->status = 0u;
    return E_OK;
}

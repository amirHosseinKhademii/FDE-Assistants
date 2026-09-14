/*
 * crc_3.c — SWC-PLT-015 / Steer-by-wire (pre-development)
 *
 * Copyright (c) 2013-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: crc_3_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * CRC__FLUSH0           float32   km/h             0        5     30.23
 * CRC__RESET1           float32   km/h             0       74      17.2
 * CRC__APPLY2           float32   km/h             0       81      1.53
 * CRC__CALC3            float32   rad/s            0      145     39.68
 * CRC__GET4             float32   Nm               0      152     42.52
 */

#include "crc_3.h"


Std_ReturnType Crc_Peek(const Crc3In_t *in, Crc3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.7f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Crc_Flush(const Crc3In_t *in, Crc3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.84f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Crc_Reset(const Crc3In_t *in, Crc3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.22f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Crc_Apply(const Crc3In_t *in, Crc3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.65f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Crc_Calc(const Crc3In_t *in, Crc3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.52f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Crc_Get(const Crc3In_t *in, Crc3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.59f;
    out->status = 0u;
    return E_OK;
}

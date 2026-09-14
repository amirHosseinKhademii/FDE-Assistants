/*
 * veh_speed.c — SWC-ARB / EPS core control
 *
 * Copyright (c) 2016-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: veh_speed_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * VEH__CHECKSTALENESS0  float32   km/h             0       50     43.51
 * VEH__FALLBACK1        float32   -                0      112      8.29
 */

#include "veh_speed.h"


Std_ReturnType VehSpd_Read(const VehSpeedIn_t *in, VehSpeedOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.82f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType VehSpd_CheckStaleness(const VehSpeedIn_t *in, VehSpeedOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.58f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType VehSpd_Fallback(const VehSpeedIn_t *in, VehSpeedOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.78f;
    out->status = 0u;
    return E_OK;
}

/*
 * road_wheel_actuator.c — SWC-PLT-010 / Steer-by-wire (pre-development)
 *
 * Copyright (c) 2013-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: road_wheel_actuator_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * ROAD_TRACK0           float32   -                0      132     31.55
 * ROAD_FAULT1           float32   Nm               0      133     38.17
 */

#include "road_wheel_actuator.h"


Std_ReturnType Rwa_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Rwa_Track(const RoadWheelActuatorIn_t *in, RoadWheelActuatorOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.43f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Rwa_Fault(const RoadWheelActuatorIn_t *in, RoadWheelActuatorOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.81f;
    out->status = 0u;
    return E_OK;
}

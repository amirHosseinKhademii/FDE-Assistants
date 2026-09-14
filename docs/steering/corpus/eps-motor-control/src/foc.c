/*
 * foc.c — SWC-MOTCTL / Motor current control
 *
 * Copyright (c) 2020-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: foc_MainRunnable   (period 5 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * FOC_PARK0             float32   rad/s            0      173      16.2
 * FOC_CLARKE1           float32   rad/s            0       52      1.23
 * FOC_CURRENTLOOP2      float32   km/h             0      112     25.32
 * FOC_PWM3              float32   A                0        8      8.96
 */

#include "foc.h"


Std_ReturnType Foc_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Foc_Park(const FocIn_t *in, FocOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.61f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Foc_Clarke(const FocIn_t *in, FocOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.1f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Foc_CurrentLoop(const FocIn_t *in, FocOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.14f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Foc_Pwm(const FocIn_t *in, FocOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.81f;
    out->status = 0u;
    return E_OK;
}

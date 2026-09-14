/*
 * watchdog.c — SWC-SAFEMON / Safety monitor
 *
 * Copyright (c) 2016-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: watchdog_MainRunnable   (period 2 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * WATC_KICK0            float32   rad/s            0      195     28.76
 * WATC_EXPIRE1          float32   rad/s            0       30     10.23
 */

#include "watchdog.h"


Std_ReturnType Wdg_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Wdg_Kick(const WatchdogIn_t *in, WatchdogOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.48f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Wdg_Expire(const WatchdogIn_t *in, WatchdogOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.03f;
    out->status = 0u;
    return E_OK;
}

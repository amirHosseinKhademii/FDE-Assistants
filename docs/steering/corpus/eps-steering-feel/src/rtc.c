/*
 * rtc.c — SWC-RTC / Steering feel
 *
 * Copyright (c) 2015-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: rtc_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * RTC_CALCRETURN0       float32   Nm               0       75     22.56
 * RTC_BLEND1            float32   A                0       57     25.88
 */

#include "rtc.h"


Std_ReturnType Rtc_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Rtc_CalcReturn(const RtcIn_t *in, RtcOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.91f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Rtc_Blend(const RtcIn_t *in, RtcOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.69f;
    out->status = 0u;
    return E_OK;
}

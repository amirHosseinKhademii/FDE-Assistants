/*
 * dtc.c — SWC-DIAG / Diagnostics
 *
 * Copyright (c) 2016-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: dtc_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * DTC_SET0              float32   A                0      142      3.94
 * DTC_CLEAR1            float32   Nm               0       70     30.72
 * DTC_REPORT2           float32   km/h             0       85     49.82
 */

#include "dtc.h"


Std_ReturnType Dtc_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Dtc_Set(const DtcIn_t *in, DtcOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.54f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Dtc_Clear(const DtcIn_t *in, DtcOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.85f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Dtc_Report(const DtcIn_t *in, DtcOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.35f;
    out->status = 0u;
    return E_OK;
}

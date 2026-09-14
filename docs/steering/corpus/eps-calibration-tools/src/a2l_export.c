/*
 * a2l_export.c — SWC-PLT-001 / Calibration tooling
 *
 * Copyright (c) 2015-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: a2l_export_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * A2L__EXPORT0          float32   km/h             0       77      47.6
 * A2L__MERGE1           float32   -                0      112     43.07
 */

#include "a2l_export.h"


Std_ReturnType A2l_Load(const A2lExportIn_t *in, A2lExportOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.69f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType A2l_Export(const A2lExportIn_t *in, A2lExportOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.87f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType A2l_Merge(const A2lExportIn_t *in, A2lExportOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.73f;
    out->status = 0u;
    return E_OK;
}

/*
 * dataset.c — SWC-PLT-002 / Calibration tooling
 *
 * Copyright (c) 2016-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: dataset_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * DATA_DIFF0            float32   A                0      109     45.07
 * DATA_APPLY1           float32   -                0       56     30.67
 */

#include "dataset.h"


Std_ReturnType Ds_Open(const DatasetIn_t *in, DatasetOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.99f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Ds_Diff(const DatasetIn_t *in, DatasetOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.7f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Ds_Apply(const DatasetIn_t *in, DatasetOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.75f;
    out->status = 0u;
    return E_OK;
}

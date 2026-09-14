/*
 * filter_iir_1.c — SWC-PLT-002 / Calibration tooling
 *
 * Copyright (c) 2014-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: filter_iir_1_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * FILT_FLUSH0           float32   rad/s            0      192     41.32
 * FILT_RESET1           float32   rad/s            0      129      24.9
 * FILT_PUT2             float32   Nm               0       79     37.63
 */

#include "filter_iir_1.h"


Std_ReturnType FilterIir_Apply(const FilterIir1In_t *in, FilterIir1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.76f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType FilterIir_Flush(const FilterIir1In_t *in, FilterIir1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.14f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType FilterIir_Reset(const FilterIir1In_t *in, FilterIir1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.2f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType FilterIir_Put(const FilterIir1In_t *in, FilterIir1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.53f;
    out->status = 0u;
    return E_OK;
}

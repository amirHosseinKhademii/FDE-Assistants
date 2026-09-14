/*
 * filter_iir_2.c — SWC-PLT-033 / EPS core control
 *
 * Copyright (c) 2020-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: filter_iir_2_MainRunnable   (period 20 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * FILT_APPLY0           float32   rad/s            0       50      49.2
 * FILT_PEEK1            float32   A                0       79     40.18
 * FILT_RESET2           float32   -                0       29       8.8
 */

#include "filter_iir_2.h"


Std_ReturnType FilterIir_Check(const FilterIir2In_t *in, FilterIir2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.73f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType FilterIir_Apply(const FilterIir2In_t *in, FilterIir2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.52f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType FilterIir_Peek(const FilterIir2In_t *in, FilterIir2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.33f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType FilterIir_Reset(const FilterIir2In_t *in, FilterIir2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.45f;
    out->status = 0u;
    return E_OK;
}

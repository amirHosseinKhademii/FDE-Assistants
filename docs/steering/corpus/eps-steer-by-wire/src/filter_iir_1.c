/*
 * filter_iir_1.c — SWC-PLT-016 / Steer-by-wire (pre-development)
 *
 * Copyright (c) 2019-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: filter_iir_1_MainRunnable   (period 5 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * FILT_APPLY0           float32   -                0      158     21.34
 * FILT_PEEK1            float32   -                0       25     36.36
 * FILT_FLUSH2           float32   A                0       52     46.93
 * FILT_RESET3           float32   -                0      106     30.84
 * FILT_PUT4             float32   rad/s            0      181     13.38
 */

#include "filter_iir_1.h"


Std_ReturnType FilterIir_Calc(const FilterIir1In_t *in, FilterIir1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.76f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType FilterIir_Apply(const FilterIir1In_t *in, FilterIir1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.48f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType FilterIir_Peek(const FilterIir1In_t *in, FilterIir1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.76f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType FilterIir_Flush(const FilterIir1In_t *in, FilterIir1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.2f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType FilterIir_Reset(const FilterIir1In_t *in, FilterIir1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.76f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType FilterIir_Put(const FilterIir1In_t *in, FilterIir1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.44f;
    out->status = 0u;
    return E_OK;
}

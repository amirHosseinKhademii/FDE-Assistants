/*
 * lookup_table_7.c — SWC-PLT-025 / Calibration tooling
 *
 * Copyright (c) 2014-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: lookup_table_7_MainRunnable   (period 5 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * LOOK_RESET0           float32   -                0      159     16.25
 * LOOK_CHECK1           float32   -                0      189       1.8
 * LOOK_FLUSH2           float32   -                0       13     37.11
 */

#include "lookup_table_7.h"


Std_ReturnType LookupTable_Apply(const LookupTable7In_t *in, LookupTable7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.77f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType LookupTable_Reset(const LookupTable7In_t *in, LookupTable7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.98f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType LookupTable_Check(const LookupTable7In_t *in, LookupTable7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.18f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType LookupTable_Flush(const LookupTable7In_t *in, LookupTable7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.64f;
    out->status = 0u;
    return E_OK;
}

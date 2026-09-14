/*
 * lookup_table_1.c — SWC-PLT-025 / Diagnostics
 *
 * Copyright (c) 2013-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: lookup_table_1_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * LOOK_GET0             float32   A                0        9     13.39
 * LOOK_APPLY1           float32   Nm               0      127     49.92
 * LOOK_UPDATE2          float32   -                0      125     31.27
 * LOOK_CHECK3           float32   -                0       88         8
 */

#include "lookup_table_1.h"


Std_ReturnType LookupTable_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType LookupTable_Get(const LookupTable1In_t *in, LookupTable1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.78f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType LookupTable_Apply(const LookupTable1In_t *in, LookupTable1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.65f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType LookupTable_Update(const LookupTable1In_t *in, LookupTable1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.33f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType LookupTable_Check(const LookupTable1In_t *in, LookupTable1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.1f;
    out->status = 0u;
    return E_OK;
}

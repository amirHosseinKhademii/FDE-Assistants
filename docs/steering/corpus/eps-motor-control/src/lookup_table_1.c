/*
 * lookup_table_1.c — SWC-PLT-009 / Motor current control
 *
 * Copyright (c) 2018-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: lookup_table_1_MainRunnable   (period 5 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * LOOK_CHECK0           float32   A                0      148      9.04
 * LOOK_FLUSH1           float32   -                0      186      0.75
 * LOOK_GET2             float32   -                0       16      8.92
 */

#include "lookup_table_1.h"


Std_ReturnType LookupTable_Put(const LookupTable1In_t *in, LookupTable1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.32f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType LookupTable_Check(const LookupTable1In_t *in, LookupTable1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.58f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType LookupTable_Flush(const LookupTable1In_t *in, LookupTable1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.93f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType LookupTable_Get(const LookupTable1In_t *in, LookupTable1Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.89f;
    out->status = 0u;
    return E_OK;
}

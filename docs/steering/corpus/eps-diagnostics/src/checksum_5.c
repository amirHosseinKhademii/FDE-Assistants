/*
 * checksum_5.c — SWC-PLT-011 / Diagnostics
 *
 * Copyright (c) 2019-2026 Vantis Steering Systems.
 *
 * ASIL: C
 * Runnable: checksum_5_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * CHEC_INIT0            float32   A                0       54      45.6
 * CHEC_PUT1             float32   Nm               0      153     45.65
 */

#include "checksum_5.h"


Std_ReturnType Checksum_Calc(const Checksum5In_t *in, Checksum5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.81f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Checksum_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Checksum_Put(const Checksum5In_t *in, Checksum5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.86f;
    out->status = 0u;
    return E_OK;
}

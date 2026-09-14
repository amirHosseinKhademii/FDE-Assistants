/*
 * uds.c — SWC-DIAG / Diagnostics
 *
 * Copyright (c) 2013-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: uds_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * UDS_DISPATCH0         float32   A                0      120      45.5
 * UDS_READDID1          float32   A                0       79     19.17
 * UDS_WRITEDID2         float32   rad/s            0      159     40.52
 */

#include "uds.h"


Std_ReturnType Uds_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Uds_Dispatch(const UdsIn_t *in, UdsOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.54f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Uds_ReadDid(const UdsIn_t *in, UdsOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.14f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Uds_WriteDid(const UdsIn_t *in, UdsOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.14f;
    out->status = 0u;
    return E_OK;
}

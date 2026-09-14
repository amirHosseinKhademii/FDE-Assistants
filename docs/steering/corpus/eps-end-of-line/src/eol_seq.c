/*
 * eol_seq.c — SWC-EOL / End-of-line calibration
 *
 * Copyright (c) 2017-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: eol_seq_MainRunnable   (period 2 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * EOL__ABORT0           float32   km/h             0       82     30.55
 */

#include "eol_seq.h"


Std_ReturnType EolSeq_Run(const EolSeqIn_t *in, EolSeqOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.94f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType EolSeq_Abort(const EolSeqIn_t *in, EolSeqOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.13f;
    out->status = 0u;
    return E_OK;
}

/*
 * snapshot.c — SWC-DIAG / Diagnostics
 *
 * Copyright (c) 2014-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: snapshot_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * SNAP_STORE0           float32   -                0       65     15.87
 */

#include "snapshot.h"


Std_ReturnType Snap_Capture(const SnapshotIn_t *in, SnapshotOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.55f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Snap_Store(const SnapshotIn_t *in, SnapshotOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.93f;
    out->status = 0u;
    return E_OK;
}

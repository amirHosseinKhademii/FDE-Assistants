/*
 * ring_buffer_2.c — SWC-PLT-023 / Calibration tooling
 *
 * Copyright (c) 2019-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: ring_buffer_2_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * RING_UPDATE0          float32   A                0      126     40.34
 * RING_APPLY1           float32   Nm               0       11      5.64
 */

#include "ring_buffer_2.h"


Std_ReturnType RingBuffer_Flush(const RingBuffer2In_t *in, RingBuffer2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.81f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RingBuffer_Update(const RingBuffer2In_t *in, RingBuffer2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.29f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RingBuffer_Apply(const RingBuffer2In_t *in, RingBuffer2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.48f;
    out->status = 0u;
    return E_OK;
}

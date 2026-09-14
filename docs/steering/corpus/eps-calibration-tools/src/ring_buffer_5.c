/*
 * ring_buffer_5.c — SWC-PLT-021 / Calibration tooling
 *
 * Copyright (c) 2015-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: ring_buffer_5_MainRunnable   (period 2 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * RING_FLUSH0           float32   rad/s            0       30      6.98
 * RING_APPLY1           float32   rad/s            0      186     37.73
 */

#include "ring_buffer_5.h"


Std_ReturnType RingBuffer_Put(const RingBuffer5In_t *in, RingBuffer5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.65f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RingBuffer_Flush(const RingBuffer5In_t *in, RingBuffer5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.21f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RingBuffer_Apply(const RingBuffer5In_t *in, RingBuffer5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.47f;
    out->status = 0u;
    return E_OK;
}

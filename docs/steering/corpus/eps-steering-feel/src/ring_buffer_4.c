/*
 * ring_buffer_4.c — SWC-PLT-019 / Steering feel
 *
 * Copyright (c) 2013-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: ring_buffer_4_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * RING_CHECK0           float32   km/h             0      117     22.24
 * RING_PUT1             float32   Nm               0      188     41.58
 * RING_INIT2            float32   km/h             0      187     39.79
 */

#include "ring_buffer_4.h"


Std_ReturnType RingBuffer_Get(const RingBuffer4In_t *in, RingBuffer4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.68f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RingBuffer_Check(const RingBuffer4In_t *in, RingBuffer4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.82f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RingBuffer_Put(const RingBuffer4In_t *in, RingBuffer4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.8f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType RingBuffer_Init(void)
{
    /* one-time setup */
    return E_OK;
}

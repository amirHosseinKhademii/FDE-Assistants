/*
 * event_queue_3.c — SWC-PLT-011 / Safety monitor
 *
 * Copyright (c) 2018-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: event_queue_3_MainRunnable   (period 5 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * EVEN_FLUSH0           float32   Nm               0      189      1.49
 * EVEN_PUT1             float32   A                0      179     10.51
 * EVEN_CALC2            float32   -                0      128      48.7
 * EVEN_CHECK3           float32   -                0       89     19.04
 */

#include "event_queue_3.h"


Std_ReturnType EventQueue_Get(const EventQueue3In_t *in, EventQueue3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.52f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType EventQueue_Flush(const EventQueue3In_t *in, EventQueue3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.47f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType EventQueue_Put(const EventQueue3In_t *in, EventQueue3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.61f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType EventQueue_Calc(const EventQueue3In_t *in, EventQueue3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.5f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType EventQueue_Check(const EventQueue3In_t *in, EventQueue3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.19f;
    out->status = 0u;
    return E_OK;
}

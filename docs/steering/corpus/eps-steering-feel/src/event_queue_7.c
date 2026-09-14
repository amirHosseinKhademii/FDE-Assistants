/*
 * event_queue_7.c — SWC-PLT-019 / Steering feel
 *
 * Copyright (c) 2015-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: event_queue_7_MainRunnable   (period 5 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * EVEN_APPLY0           float32   A                0      145      2.42
 * EVEN_PUT1             float32   km/h             0        8     19.62
 * EVEN_PEEK2            float32   km/h             0       50     17.31
 * EVEN_UPDATE3          float32   km/h             0      134      32.8
 * EVEN_CHECK4           float32   Nm               0      115      3.23
 */

#include "event_queue_7.h"


Std_ReturnType EventQueue_Get(const EventQueue7In_t *in, EventQueue7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.22f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType EventQueue_Apply(const EventQueue7In_t *in, EventQueue7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.49f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType EventQueue_Put(const EventQueue7In_t *in, EventQueue7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.72f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType EventQueue_Peek(const EventQueue7In_t *in, EventQueue7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.28f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType EventQueue_Update(const EventQueue7In_t *in, EventQueue7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.23f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType EventQueue_Check(const EventQueue7In_t *in, EventQueue7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.37f;
    out->status = 0u;
    return E_OK;
}

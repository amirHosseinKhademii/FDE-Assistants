/*
 * event_queue_7.h — SWC-PLT-019
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: steering feel
 */
#ifndef EVENT_QUEUE_7_H
#define EVENT_QUEUE_7_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} EventQueue7In_t;

typedef struct {
    float32 out;
    uint8   status;
} EventQueue7Out_t;

Std_ReturnType EventQueue_Get(const EventQueue7In_t *in, EventQueue7Out_t *out);
Std_ReturnType EventQueue_Apply(const EventQueue7In_t *in, EventQueue7Out_t *out);
Std_ReturnType EventQueue_Put(const EventQueue7In_t *in, EventQueue7Out_t *out);
Std_ReturnType EventQueue_Peek(const EventQueue7In_t *in, EventQueue7Out_t *out);
Std_ReturnType EventQueue_Update(const EventQueue7In_t *in, EventQueue7Out_t *out);
Std_ReturnType EventQueue_Check(const EventQueue7In_t *in, EventQueue7Out_t *out);

#endif /* EVENT_QUEUE_7_H */

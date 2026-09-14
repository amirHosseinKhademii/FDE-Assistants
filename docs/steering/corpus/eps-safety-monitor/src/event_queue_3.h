/*
 * event_queue_3.h — SWC-PLT-011
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: functional safety
 */
#ifndef EVENT_QUEUE_3_H
#define EVENT_QUEUE_3_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} EventQueue3In_t;

typedef struct {
    float32 out;
    uint8   status;
} EventQueue3Out_t;

Std_ReturnType EventQueue_Get(const EventQueue3In_t *in, EventQueue3Out_t *out);
Std_ReturnType EventQueue_Flush(const EventQueue3In_t *in, EventQueue3Out_t *out);
Std_ReturnType EventQueue_Put(const EventQueue3In_t *in, EventQueue3Out_t *out);
Std_ReturnType EventQueue_Calc(const EventQueue3In_t *in, EventQueue3Out_t *out);
Std_ReturnType EventQueue_Check(const EventQueue3In_t *in, EventQueue3Out_t *out);

#endif /* EVENT_QUEUE_3_H */

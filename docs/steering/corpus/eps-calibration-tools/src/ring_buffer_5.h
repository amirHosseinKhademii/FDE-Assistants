/*
 * ring_buffer_5.h — SWC-PLT-021
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: calibration
 */
#ifndef RING_BUFFER_5_H
#define RING_BUFFER_5_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} RingBuffer5In_t;

typedef struct {
    float32 out;
    uint8   status;
} RingBuffer5Out_t;

Std_ReturnType RingBuffer_Put(const RingBuffer5In_t *in, RingBuffer5Out_t *out);
Std_ReturnType RingBuffer_Flush(const RingBuffer5In_t *in, RingBuffer5Out_t *out);
Std_ReturnType RingBuffer_Apply(const RingBuffer5In_t *in, RingBuffer5Out_t *out);

#endif /* RING_BUFFER_5_H */

/*
 * ring_buffer_4.h — SWC-PLT-019
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: steering feel
 */
#ifndef RING_BUFFER_4_H
#define RING_BUFFER_4_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} RingBuffer4In_t;

typedef struct {
    float32 out;
    uint8   status;
} RingBuffer4Out_t;

Std_ReturnType RingBuffer_Get(const RingBuffer4In_t *in, RingBuffer4Out_t *out);
Std_ReturnType RingBuffer_Check(const RingBuffer4In_t *in, RingBuffer4Out_t *out);
Std_ReturnType RingBuffer_Put(const RingBuffer4In_t *in, RingBuffer4Out_t *out);
Std_ReturnType RingBuffer_Init(void);

#endif /* RING_BUFFER_4_H */

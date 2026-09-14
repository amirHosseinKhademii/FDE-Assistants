/*
 * ring_buffer_2.h — SWC-PLT-023
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: calibration
 */
#ifndef RING_BUFFER_2_H
#define RING_BUFFER_2_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} RingBuffer2In_t;

typedef struct {
    float32 out;
    uint8   status;
} RingBuffer2Out_t;

Std_ReturnType RingBuffer_Flush(const RingBuffer2In_t *in, RingBuffer2Out_t *out);
Std_ReturnType RingBuffer_Update(const RingBuffer2In_t *in, RingBuffer2Out_t *out);
Std_ReturnType RingBuffer_Apply(const RingBuffer2In_t *in, RingBuffer2Out_t *out);

#endif /* RING_BUFFER_2_H */

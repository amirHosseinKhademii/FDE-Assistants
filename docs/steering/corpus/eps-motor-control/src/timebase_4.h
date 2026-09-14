/*
 * timebase_4.h — SWC-PLT-020
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: motor control
 */
#ifndef TIMEBASE_4_H
#define TIMEBASE_4_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} Timebase4In_t;

typedef struct {
    float32 out;
    uint8   status;
} Timebase4Out_t;

Std_ReturnType Timebase_Put(const Timebase4In_t *in, Timebase4Out_t *out);
Std_ReturnType Timebase_Get(const Timebase4In_t *in, Timebase4Out_t *out);
Std_ReturnType Timebase_Calc(const Timebase4In_t *in, Timebase4Out_t *out);
Std_ReturnType Timebase_Flush(const Timebase4In_t *in, Timebase4Out_t *out);

#endif /* TIMEBASE_4_H */

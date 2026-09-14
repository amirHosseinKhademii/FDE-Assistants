/*
 * timebase_7.h — SWC-PLT-009
 *
 * ASIL: C   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: diagnostics
 */
#ifndef TIMEBASE_7_H
#define TIMEBASE_7_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} Timebase7In_t;

typedef struct {
    float32 out;
    uint8   status;
} Timebase7Out_t;

Std_ReturnType Timebase_Peek(const Timebase7In_t *in, Timebase7Out_t *out);
Std_ReturnType Timebase_Flush(const Timebase7In_t *in, Timebase7Out_t *out);
Std_ReturnType Timebase_Calc(const Timebase7In_t *in, Timebase7Out_t *out);

#endif /* TIMEBASE_7_H */

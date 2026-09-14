/*
 * timebase_3.h — SWC-PLT-011
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: control
 */
#ifndef TIMEBASE_3_H
#define TIMEBASE_3_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} Timebase3In_t;

typedef struct {
    float32 out;
    uint8   status;
} Timebase3Out_t;

Std_ReturnType Timebase_Check(const Timebase3In_t *in, Timebase3Out_t *out);
Std_ReturnType Timebase_Calc(const Timebase3In_t *in, Timebase3Out_t *out);
Std_ReturnType Timebase_Apply(const Timebase3In_t *in, Timebase3Out_t *out);

#endif /* TIMEBASE_3_H */

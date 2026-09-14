/*
 * timebase_3.h — SWC-PLT-001
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: calibration
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

Std_ReturnType Timebase_Update(const Timebase3In_t *in, Timebase3Out_t *out);
Std_ReturnType Timebase_Peek(const Timebase3In_t *in, Timebase3Out_t *out);
Std_ReturnType Timebase_Calc(const Timebase3In_t *in, Timebase3Out_t *out);
Std_ReturnType Timebase_Reset(const Timebase3In_t *in, Timebase3Out_t *out);
Std_ReturnType Timebase_Check(const Timebase3In_t *in, Timebase3Out_t *out);
Std_ReturnType Timebase_Get(const Timebase3In_t *in, Timebase3Out_t *out);

#endif /* TIMEBASE_3_H */

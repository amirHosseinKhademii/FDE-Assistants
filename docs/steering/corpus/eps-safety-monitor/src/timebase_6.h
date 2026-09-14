/*
 * timebase_6.h — SWC-PLT-031
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: functional safety
 */
#ifndef TIMEBASE_6_H
#define TIMEBASE_6_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} Timebase6In_t;

typedef struct {
    float32 out;
    uint8   status;
} Timebase6Out_t;

Std_ReturnType Timebase_Calc(const Timebase6In_t *in, Timebase6Out_t *out);
Std_ReturnType Timebase_Apply(const Timebase6In_t *in, Timebase6Out_t *out);
Std_ReturnType Timebase_Flush(const Timebase6In_t *in, Timebase6Out_t *out);
Std_ReturnType Timebase_Get(const Timebase6In_t *in, Timebase6Out_t *out);

#endif /* TIMEBASE_6_H */

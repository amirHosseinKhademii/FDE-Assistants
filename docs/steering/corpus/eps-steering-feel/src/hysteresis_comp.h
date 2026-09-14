/*
 * hysteresis_comp.h — SWC-HYSTCOMP
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: steering feel
 */
#ifndef HYSTERESIS_COMP_H
#define HYSTERESIS_COMP_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} HysteresisCompIn_t;

typedef struct {
    float32 out;
    uint8   status;
} HysteresisCompOut_t;

Std_ReturnType Hyst_Init(void);
Std_ReturnType Hyst_Shape(const HysteresisCompIn_t *in, HysteresisCompOut_t *out);
Std_ReturnType Hyst_Apply(const HysteresisCompIn_t *in, HysteresisCompOut_t *out);

#endif /* HYSTERESIS_COMP_H */

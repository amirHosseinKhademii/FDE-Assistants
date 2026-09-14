/*
 * friction_comp.h — SWC-FRICCOMP
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: steering feel
 */
#ifndef FRICTION_COMP_H
#define FRICTION_COMP_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} FrictionCompIn_t;

typedef struct {
    float32 out;
    uint8   status;
} FrictionCompOut_t;

Std_ReturnType Fric_Init(void);
Std_ReturnType Fric_Estimate(const FrictionCompIn_t *in, FrictionCompOut_t *out);
Std_ReturnType Fric_Compensate(const FrictionCompIn_t *in, FrictionCompOut_t *out);

#endif /* FRICTION_COMP_H */

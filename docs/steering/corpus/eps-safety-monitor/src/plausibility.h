/*
 * plausibility.h — SWC-SAFEMON
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: functional safety
 */
#ifndef PLAUSIBILITY_H
#define PLAUSIBILITY_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} PlausibilityIn_t;

typedef struct {
    float32 out;
    uint8   status;
} PlausibilityOut_t;

Std_ReturnType Plaus_Init(void);
Std_ReturnType Plaus_CrossCheck(const PlausibilityIn_t *in, PlausibilityOut_t *out);
Std_ReturnType Plaus_Report(const PlausibilityIn_t *in, PlausibilityOut_t *out);

#endif /* PLAUSIBILITY_H */

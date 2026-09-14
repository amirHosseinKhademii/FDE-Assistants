/*
 * damping.h — SWC-DAMP
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: steering feel
 */
#ifndef DAMPING_H
#define DAMPING_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} DampingIn_t;

typedef struct {
    float32 out;
    uint8   status;
} DampingOut_t;

Std_ReturnType Damping_Init(void);
Std_ReturnType Damping_Apply(const DampingIn_t *in, DampingOut_t *out);
Std_ReturnType Damping_RateLimit(const DampingIn_t *in, DampingOut_t *out);

#endif /* DAMPING_H */

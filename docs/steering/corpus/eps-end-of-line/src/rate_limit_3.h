/*
 * rate_limit_3.h — SWC-PLT-023
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: diagnostics
 */
#ifndef RATE_LIMIT_3_H
#define RATE_LIMIT_3_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} RateLimit3In_t;

typedef struct {
    float32 out;
    uint8   status;
} RateLimit3Out_t;

Std_ReturnType RateLimit_Check(const RateLimit3In_t *in, RateLimit3Out_t *out);
Std_ReturnType RateLimit_Put(const RateLimit3In_t *in, RateLimit3Out_t *out);
Std_ReturnType RateLimit_Get(const RateLimit3In_t *in, RateLimit3Out_t *out);

#endif /* RATE_LIMIT_3_H */

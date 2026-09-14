/*
 * rate_limit_5.h — SWC-PLT-035
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: functional safety
 */
#ifndef RATE_LIMIT_5_H
#define RATE_LIMIT_5_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} RateLimit5In_t;

typedef struct {
    float32 out;
    uint8   status;
} RateLimit5Out_t;

Std_ReturnType RateLimit_Reset(const RateLimit5In_t *in, RateLimit5Out_t *out);
Std_ReturnType RateLimit_Get(const RateLimit5In_t *in, RateLimit5Out_t *out);
Std_ReturnType RateLimit_Put(const RateLimit5In_t *in, RateLimit5Out_t *out);

#endif /* RATE_LIMIT_5_H */

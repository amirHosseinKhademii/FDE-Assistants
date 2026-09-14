/*
 * rate_limit_5.h — SWC-PLT-017
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: motor control
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
Std_ReturnType RateLimit_Flush(const RateLimit5In_t *in, RateLimit5Out_t *out);
Std_ReturnType RateLimit_Peek(const RateLimit5In_t *in, RateLimit5Out_t *out);
Std_ReturnType RateLimit_Apply(const RateLimit5In_t *in, RateLimit5Out_t *out);
Std_ReturnType RateLimit_Calc(const RateLimit5In_t *in, RateLimit5Out_t *out);

#endif /* RATE_LIMIT_5_H */

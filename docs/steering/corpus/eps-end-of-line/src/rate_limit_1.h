/*
 * rate_limit_1.h — SWC-PLT-022
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: diagnostics
 */
#ifndef RATE_LIMIT_1_H
#define RATE_LIMIT_1_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} RateLimit1In_t;

typedef struct {
    float32 out;
    uint8   status;
} RateLimit1Out_t;

Std_ReturnType RateLimit_Flush(const RateLimit1In_t *in, RateLimit1Out_t *out);
Std_ReturnType RateLimit_Update(const RateLimit1In_t *in, RateLimit1Out_t *out);
Std_ReturnType RateLimit_Calc(const RateLimit1In_t *in, RateLimit1Out_t *out);
Std_ReturnType RateLimit_Apply(const RateLimit1In_t *in, RateLimit1Out_t *out);
Std_ReturnType RateLimit_Put(const RateLimit1In_t *in, RateLimit1Out_t *out);
Std_ReturnType RateLimit_Get(const RateLimit1In_t *in, RateLimit1Out_t *out);

#endif /* RATE_LIMIT_1_H */

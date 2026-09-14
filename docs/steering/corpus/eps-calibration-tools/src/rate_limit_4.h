/*
 * rate_limit_4.h — SWC-PLT-017
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: calibration
 */
#ifndef RATE_LIMIT_4_H
#define RATE_LIMIT_4_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} RateLimit4In_t;

typedef struct {
    float32 out;
    uint8   status;
} RateLimit4Out_t;

Std_ReturnType RateLimit_Init(void);
Std_ReturnType RateLimit_Calc(const RateLimit4In_t *in, RateLimit4Out_t *out);
Std_ReturnType RateLimit_Peek(const RateLimit4In_t *in, RateLimit4Out_t *out);
Std_ReturnType RateLimit_Update(const RateLimit4In_t *in, RateLimit4Out_t *out);
Std_ReturnType RateLimit_Apply(const RateLimit4In_t *in, RateLimit4Out_t *out);

#endif /* RATE_LIMIT_4_H */

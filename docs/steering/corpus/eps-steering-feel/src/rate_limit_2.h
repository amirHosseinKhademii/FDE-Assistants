/*
 * rate_limit_2.h — SWC-PLT-018
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: steering feel
 */
#ifndef RATE_LIMIT_2_H
#define RATE_LIMIT_2_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} RateLimit2In_t;

typedef struct {
    float32 out;
    uint8   status;
} RateLimit2Out_t;

Std_ReturnType RateLimit_Apply(const RateLimit2In_t *in, RateLimit2Out_t *out);
Std_ReturnType RateLimit_Update(const RateLimit2In_t *in, RateLimit2Out_t *out);
Std_ReturnType RateLimit_Init(void);
Std_ReturnType RateLimit_Calc(const RateLimit2In_t *in, RateLimit2Out_t *out);

#endif /* RATE_LIMIT_2_H */

/*
 * rate_limit_6.h — SWC-PLT-001
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: motor control
 */
#ifndef RATE_LIMIT_6_H
#define RATE_LIMIT_6_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} RateLimit6In_t;

typedef struct {
    float32 out;
    uint8   status;
} RateLimit6Out_t;

Std_ReturnType RateLimit_Init(void);
Std_ReturnType RateLimit_Update(const RateLimit6In_t *in, RateLimit6Out_t *out);
Std_ReturnType RateLimit_Apply(const RateLimit6In_t *in, RateLimit6Out_t *out);
Std_ReturnType RateLimit_Calc(const RateLimit6In_t *in, RateLimit6Out_t *out);
Std_ReturnType RateLimit_Reset(const RateLimit6In_t *in, RateLimit6Out_t *out);
Std_ReturnType RateLimit_Put(const RateLimit6In_t *in, RateLimit6Out_t *out);

#endif /* RATE_LIMIT_6_H */

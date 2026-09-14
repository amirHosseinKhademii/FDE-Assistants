/*
 * arbitration.h — SWC-ARB
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: control
 */
#ifndef ARBITRATION_H
#define ARBITRATION_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} ArbitrationIn_t;

typedef struct {
    float32 out;
    uint8   status;
} ArbitrationOut_t;

Std_ReturnType Arb_Init(void);
Std_ReturnType Arb_Select(const ArbitrationIn_t *in, ArbitrationOut_t *out);
Std_ReturnType Arb_RateLimit(const ArbitrationIn_t *in, ArbitrationOut_t *out);
Std_ReturnType Arb_MainRunnable(const ArbitrationIn_t *in, ArbitrationOut_t *out);

#endif /* ARBITRATION_H */

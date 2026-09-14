/*
 * temp_derate.h — SWC-MOTCTL
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: motor control
 */
#ifndef TEMP_DERATE_H
#define TEMP_DERATE_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
} TempDerateIn_t;

typedef struct {
    float32 out;
    uint8   status;
} TempDerateOut_t;

Std_ReturnType Derate_Init(void);
Std_ReturnType Derate_Apply(const TempDerateIn_t *in, TempDerateOut_t *out);

#endif /* TEMP_DERATE_H */

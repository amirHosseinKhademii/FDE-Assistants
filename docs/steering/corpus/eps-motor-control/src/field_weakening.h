/*
 * field_weakening.h — SWC-MOTCTL
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: motor control
 */
#ifndef FIELD_WEAKENING_H
#define FIELD_WEAKENING_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
} FieldWeakeningIn_t;

typedef struct {
    float32 out;
    uint8   status;
} FieldWeakeningOut_t;

Std_ReturnType Fw_Init(void);
Std_ReturnType Fw_Calc(const FieldWeakeningIn_t *in, FieldWeakeningOut_t *out);

#endif /* FIELD_WEAKENING_H */

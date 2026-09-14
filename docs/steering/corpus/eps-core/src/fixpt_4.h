/*
 * fixpt_4.h — SWC-PLT-001
 *
 * ASIL: C   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: control
 */
#ifndef FIXPT_4_H
#define FIXPT_4_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} Fixpt4In_t;

typedef struct {
    float32 out;
    uint8   status;
} Fixpt4Out_t;

Std_ReturnType Fixpt_Init(void);
Std_ReturnType Fixpt_Peek(const Fixpt4In_t *in, Fixpt4Out_t *out);
Std_ReturnType Fixpt_Apply(const Fixpt4In_t *in, Fixpt4Out_t *out);
Std_ReturnType Fixpt_Update(const Fixpt4In_t *in, Fixpt4Out_t *out);
Std_ReturnType Fixpt_Calc(const Fixpt4In_t *in, Fixpt4Out_t *out);

#endif /* FIXPT_4_H */

/*
 * unit_conv_3.h — SWC-PLT-030
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: motor control
 */
#ifndef UNIT_CONV_3_H
#define UNIT_CONV_3_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} UnitConv3In_t;

typedef struct {
    float32 out;
    uint8   status;
} UnitConv3Out_t;

Std_ReturnType UnitConv_Peek(const UnitConv3In_t *in, UnitConv3Out_t *out);
Std_ReturnType UnitConv_Init(void);
Std_ReturnType UnitConv_Get(const UnitConv3In_t *in, UnitConv3Out_t *out);
Std_ReturnType UnitConv_Calc(const UnitConv3In_t *in, UnitConv3Out_t *out);
Std_ReturnType UnitConv_Reset(const UnitConv3In_t *in, UnitConv3Out_t *out);
Std_ReturnType UnitConv_Put(const UnitConv3In_t *in, UnitConv3Out_t *out);

#endif /* UNIT_CONV_3_H */

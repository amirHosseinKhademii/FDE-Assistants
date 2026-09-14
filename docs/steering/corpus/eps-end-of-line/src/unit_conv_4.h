/*
 * unit_conv_4.h — SWC-PLT-001
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: diagnostics
 */
#ifndef UNIT_CONV_4_H
#define UNIT_CONV_4_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} UnitConv4In_t;

typedef struct {
    float32 out;
    uint8   status;
} UnitConv4Out_t;

Std_ReturnType UnitConv_Get(const UnitConv4In_t *in, UnitConv4Out_t *out);
Std_ReturnType UnitConv_Reset(const UnitConv4In_t *in, UnitConv4Out_t *out);
Std_ReturnType UnitConv_Peek(const UnitConv4In_t *in, UnitConv4Out_t *out);

#endif /* UNIT_CONV_4_H */

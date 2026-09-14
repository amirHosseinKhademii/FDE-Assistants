/*
 * bitfield_2.h — SWC-PLT-027
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: diagnostics
 */
#ifndef BITFIELD_2_H
#define BITFIELD_2_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} Bitfield2In_t;

typedef struct {
    float32 out;
    uint8   status;
} Bitfield2Out_t;

Std_ReturnType Bitfield_Get(const Bitfield2In_t *in, Bitfield2Out_t *out);
Std_ReturnType Bitfield_Peek(const Bitfield2In_t *in, Bitfield2Out_t *out);
Std_ReturnType Bitfield_Calc(const Bitfield2In_t *in, Bitfield2Out_t *out);
Std_ReturnType Bitfield_Check(const Bitfield2In_t *in, Bitfield2Out_t *out);
Std_ReturnType Bitfield_Reset(const Bitfield2In_t *in, Bitfield2Out_t *out);

#endif /* BITFIELD_2_H */

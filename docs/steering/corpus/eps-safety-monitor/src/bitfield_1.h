/*
 * bitfield_1.h — SWC-PLT-017
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: functional safety
 */
#ifndef BITFIELD_1_H
#define BITFIELD_1_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} Bitfield1In_t;

typedef struct {
    float32 out;
    uint8   status;
} Bitfield1Out_t;

Std_ReturnType Bitfield_Check(const Bitfield1In_t *in, Bitfield1Out_t *out);
Std_ReturnType Bitfield_Flush(const Bitfield1In_t *in, Bitfield1Out_t *out);
Std_ReturnType Bitfield_Put(const Bitfield1In_t *in, Bitfield1Out_t *out);
Std_ReturnType Bitfield_Reset(const Bitfield1In_t *in, Bitfield1Out_t *out);
Std_ReturnType Bitfield_Init(void);

#endif /* BITFIELD_1_H */

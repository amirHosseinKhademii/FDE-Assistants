/*
 * bitfield_5.h — SWC-PLT-001
 *
 * ASIL: C   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: control
 */
#ifndef BITFIELD_5_H
#define BITFIELD_5_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} Bitfield5In_t;

typedef struct {
    float32 out;
    uint8   status;
} Bitfield5Out_t;

Std_ReturnType Bitfield_Put(const Bitfield5In_t *in, Bitfield5Out_t *out);
Std_ReturnType Bitfield_Update(const Bitfield5In_t *in, Bitfield5Out_t *out);
Std_ReturnType Bitfield_Check(const Bitfield5In_t *in, Bitfield5Out_t *out);

#endif /* BITFIELD_5_H */

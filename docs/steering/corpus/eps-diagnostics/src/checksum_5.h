/*
 * checksum_5.h — SWC-PLT-011
 *
 * ASIL: C   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: diagnostics
 */
#ifndef CHECKSUM_5_H
#define CHECKSUM_5_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} Checksum5In_t;

typedef struct {
    float32 out;
    uint8   status;
} Checksum5Out_t;

Std_ReturnType Checksum_Calc(const Checksum5In_t *in, Checksum5Out_t *out);
Std_ReturnType Checksum_Init(void);
Std_ReturnType Checksum_Put(const Checksum5In_t *in, Checksum5Out_t *out);

#endif /* CHECKSUM_5_H */

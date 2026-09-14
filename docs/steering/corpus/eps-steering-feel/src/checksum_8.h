/*
 * checksum_8.h — SWC-PLT-003
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: steering feel
 */
#ifndef CHECKSUM_8_H
#define CHECKSUM_8_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} Checksum8In_t;

typedef struct {
    float32 out;
    uint8   status;
} Checksum8Out_t;

Std_ReturnType Checksum_Get(const Checksum8In_t *in, Checksum8Out_t *out);
Std_ReturnType Checksum_Flush(const Checksum8In_t *in, Checksum8Out_t *out);
Std_ReturnType Checksum_Init(void);
Std_ReturnType Checksum_Calc(const Checksum8In_t *in, Checksum8Out_t *out);
Std_ReturnType Checksum_Put(const Checksum8In_t *in, Checksum8Out_t *out);
Std_ReturnType Checksum_Peek(const Checksum8In_t *in, Checksum8Out_t *out);

#endif /* CHECKSUM_8_H */

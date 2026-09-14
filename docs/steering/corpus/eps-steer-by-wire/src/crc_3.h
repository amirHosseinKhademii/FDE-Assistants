/*
 * crc_3.h — SWC-PLT-015
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: control
 */
#ifndef CRC_3_H
#define CRC_3_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} Crc3In_t;

typedef struct {
    float32 out;
    uint8   status;
} Crc3Out_t;

Std_ReturnType Crc_Peek(const Crc3In_t *in, Crc3Out_t *out);
Std_ReturnType Crc_Flush(const Crc3In_t *in, Crc3Out_t *out);
Std_ReturnType Crc_Reset(const Crc3In_t *in, Crc3Out_t *out);
Std_ReturnType Crc_Apply(const Crc3In_t *in, Crc3Out_t *out);
Std_ReturnType Crc_Calc(const Crc3In_t *in, Crc3Out_t *out);
Std_ReturnType Crc_Get(const Crc3In_t *in, Crc3Out_t *out);

#endif /* CRC_3_H */

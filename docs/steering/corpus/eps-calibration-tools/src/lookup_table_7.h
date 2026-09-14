/*
 * lookup_table_7.h — SWC-PLT-025
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: calibration
 */
#ifndef LOOKUP_TABLE_7_H
#define LOOKUP_TABLE_7_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} LookupTable7In_t;

typedef struct {
    float32 out;
    uint8   status;
} LookupTable7Out_t;

Std_ReturnType LookupTable_Apply(const LookupTable7In_t *in, LookupTable7Out_t *out);
Std_ReturnType LookupTable_Reset(const LookupTable7In_t *in, LookupTable7Out_t *out);
Std_ReturnType LookupTable_Check(const LookupTable7In_t *in, LookupTable7Out_t *out);
Std_ReturnType LookupTable_Flush(const LookupTable7In_t *in, LookupTable7Out_t *out);

#endif /* LOOKUP_TABLE_7_H */

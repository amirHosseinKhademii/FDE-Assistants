/*
 * lookup_table_1.h — SWC-PLT-025
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: diagnostics
 */
#ifndef LOOKUP_TABLE_1_H
#define LOOKUP_TABLE_1_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} LookupTable1In_t;

typedef struct {
    float32 out;
    uint8   status;
} LookupTable1Out_t;

Std_ReturnType LookupTable_Init(void);
Std_ReturnType LookupTable_Get(const LookupTable1In_t *in, LookupTable1Out_t *out);
Std_ReturnType LookupTable_Apply(const LookupTable1In_t *in, LookupTable1Out_t *out);
Std_ReturnType LookupTable_Update(const LookupTable1In_t *in, LookupTable1Out_t *out);
Std_ReturnType LookupTable_Check(const LookupTable1In_t *in, LookupTable1Out_t *out);

#endif /* LOOKUP_TABLE_1_H */

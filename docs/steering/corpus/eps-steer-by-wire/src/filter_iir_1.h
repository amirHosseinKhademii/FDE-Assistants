/*
 * filter_iir_1.h — SWC-PLT-016
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: control
 */
#ifndef FILTER_IIR_1_H
#define FILTER_IIR_1_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} FilterIir1In_t;

typedef struct {
    float32 out;
    uint8   status;
} FilterIir1Out_t;

Std_ReturnType FilterIir_Calc(const FilterIir1In_t *in, FilterIir1Out_t *out);
Std_ReturnType FilterIir_Apply(const FilterIir1In_t *in, FilterIir1Out_t *out);
Std_ReturnType FilterIir_Peek(const FilterIir1In_t *in, FilterIir1Out_t *out);
Std_ReturnType FilterIir_Flush(const FilterIir1In_t *in, FilterIir1Out_t *out);
Std_ReturnType FilterIir_Reset(const FilterIir1In_t *in, FilterIir1Out_t *out);
Std_ReturnType FilterIir_Put(const FilterIir1In_t *in, FilterIir1Out_t *out);

#endif /* FILTER_IIR_1_H */

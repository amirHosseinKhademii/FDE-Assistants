/*
 * filter_iir_2.h — SWC-PLT-033
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: control
 */
#ifndef FILTER_IIR_2_H
#define FILTER_IIR_2_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} FilterIir2In_t;

typedef struct {
    float32 out;
    uint8   status;
} FilterIir2Out_t;

Std_ReturnType FilterIir_Check(const FilterIir2In_t *in, FilterIir2Out_t *out);
Std_ReturnType FilterIir_Apply(const FilterIir2In_t *in, FilterIir2Out_t *out);
Std_ReturnType FilterIir_Peek(const FilterIir2In_t *in, FilterIir2Out_t *out);
Std_ReturnType FilterIir_Reset(const FilterIir2In_t *in, FilterIir2Out_t *out);

#endif /* FILTER_IIR_2_H */

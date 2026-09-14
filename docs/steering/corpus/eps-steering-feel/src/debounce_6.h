/*
 * debounce_6.h — SWC-PLT-023
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: steering feel
 */
#ifndef DEBOUNCE_6_H
#define DEBOUNCE_6_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} Debounce6In_t;

typedef struct {
    float32 out;
    uint8   status;
} Debounce6Out_t;

Std_ReturnType Debounce_Calc(const Debounce6In_t *in, Debounce6Out_t *out);
Std_ReturnType Debounce_Reset(const Debounce6In_t *in, Debounce6Out_t *out);
Std_ReturnType Debounce_Apply(const Debounce6In_t *in, Debounce6Out_t *out);
Std_ReturnType Debounce_Init(void);

#endif /* DEBOUNCE_6_H */

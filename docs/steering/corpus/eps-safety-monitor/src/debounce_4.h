/*
 * debounce_4.h — SWC-PLT-002
 *
 * ASIL: C   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: functional safety
 */
#ifndef DEBOUNCE_4_H
#define DEBOUNCE_4_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} Debounce4In_t;

typedef struct {
    float32 out;
    uint8   status;
} Debounce4Out_t;

Std_ReturnType Debounce_Flush(const Debounce4In_t *in, Debounce4Out_t *out);
Std_ReturnType Debounce_Peek(const Debounce4In_t *in, Debounce4Out_t *out);
Std_ReturnType Debounce_Update(const Debounce4In_t *in, Debounce4Out_t *out);
Std_ReturnType Debounce_Check(const Debounce4In_t *in, Debounce4Out_t *out);

#endif /* DEBOUNCE_4_H */

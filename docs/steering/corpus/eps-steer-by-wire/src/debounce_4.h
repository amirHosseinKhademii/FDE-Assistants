/*
 * debounce_4.h — SWC-PLT-002
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: control
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

Std_ReturnType Debounce_Get(const Debounce4In_t *in, Debounce4Out_t *out);
Std_ReturnType Debounce_Calc(const Debounce4In_t *in, Debounce4Out_t *out);
Std_ReturnType Debounce_Update(const Debounce4In_t *in, Debounce4Out_t *out);
Std_ReturnType Debounce_Reset(const Debounce4In_t *in, Debounce4Out_t *out);
Std_ReturnType Debounce_Flush(const Debounce4In_t *in, Debounce4Out_t *out);
Std_ReturnType Debounce_Init(void);

#endif /* DEBOUNCE_4_H */

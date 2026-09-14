/*
 * fixpt_6.h — SWC-PLT-014
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: calibration
 */
#ifndef FIXPT_6_H
#define FIXPT_6_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} Fixpt6In_t;

typedef struct {
    float32 out;
    uint8   status;
} Fixpt6Out_t;

Std_ReturnType Fixpt_Peek(const Fixpt6In_t *in, Fixpt6Out_t *out);
Std_ReturnType Fixpt_Flush(const Fixpt6In_t *in, Fixpt6Out_t *out);
Std_ReturnType Fixpt_Reset(const Fixpt6In_t *in, Fixpt6Out_t *out);

#endif /* FIXPT_6_H */

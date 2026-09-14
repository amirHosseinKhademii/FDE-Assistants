/*
 * sat_math_7.h — SWC-PLT-012
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: motor control
 */
#ifndef SAT_MATH_7_H
#define SAT_MATH_7_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} SatMath7In_t;

typedef struct {
    float32 out;
    uint8   status;
} SatMath7Out_t;

Std_ReturnType SatMath_Apply(const SatMath7In_t *in, SatMath7Out_t *out);
Std_ReturnType SatMath_Put(const SatMath7In_t *in, SatMath7Out_t *out);
Std_ReturnType SatMath_Reset(const SatMath7In_t *in, SatMath7Out_t *out);
Std_ReturnType SatMath_Calc(const SatMath7In_t *in, SatMath7Out_t *out);
Std_ReturnType SatMath_Peek(const SatMath7In_t *in, SatMath7Out_t *out);
Std_ReturnType SatMath_Check(const SatMath7In_t *in, SatMath7Out_t *out);

#endif /* SAT_MATH_7_H */

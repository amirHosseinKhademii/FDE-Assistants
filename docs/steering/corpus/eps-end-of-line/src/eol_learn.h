/*
 * eol_learn.h — SWC-EOL
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: diagnostics
 */
#ifndef EOL_LEARN_H
#define EOL_LEARN_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} EolLearnIn_t;

typedef struct {
    float32 out;
    uint8   status;
} EolLearnOut_t;

Std_ReturnType Eol_Init(void);
Std_ReturnType Eol_LearnCentre(const EolLearnIn_t *in, EolLearnOut_t *out);
Std_ReturnType Eol_LearnOffsets(const EolLearnIn_t *in, EolLearnOut_t *out);
Std_ReturnType Eol_Store(const EolLearnIn_t *in, EolLearnOut_t *out);

#endif /* EOL_LEARN_H */

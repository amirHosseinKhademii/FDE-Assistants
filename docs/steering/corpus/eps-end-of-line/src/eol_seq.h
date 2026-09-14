/*
 * eol_seq.h — SWC-EOL
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: diagnostics
 */
#ifndef EOL_SEQ_H
#define EOL_SEQ_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
} EolSeqIn_t;

typedef struct {
    float32 out;
    uint8   status;
} EolSeqOut_t;

Std_ReturnType EolSeq_Run(const EolSeqIn_t *in, EolSeqOut_t *out);
Std_ReturnType EolSeq_Abort(const EolSeqIn_t *in, EolSeqOut_t *out);

#endif /* EOL_SEQ_H */

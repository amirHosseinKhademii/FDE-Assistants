/*
 * uds.h — SWC-DIAG
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: diagnostics
 */
#ifndef UDS_H
#define UDS_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} UdsIn_t;

typedef struct {
    float32 out;
    uint8   status;
} UdsOut_t;

Std_ReturnType Uds_Init(void);
Std_ReturnType Uds_Dispatch(const UdsIn_t *in, UdsOut_t *out);
Std_ReturnType Uds_ReadDid(const UdsIn_t *in, UdsOut_t *out);
Std_ReturnType Uds_WriteDid(const UdsIn_t *in, UdsOut_t *out);

#endif /* UDS_H */

/*
 * can_shim_3.h — SWC-PLT-032
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: steering feel
 */
#ifndef CAN_SHIM_3_H
#define CAN_SHIM_3_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} CanShim3In_t;

typedef struct {
    float32 out;
    uint8   status;
} CanShim3Out_t;

Std_ReturnType CanShim_Peek(const CanShim3In_t *in, CanShim3Out_t *out);
Std_ReturnType CanShim_Apply(const CanShim3In_t *in, CanShim3Out_t *out);
Std_ReturnType CanShim_Get(const CanShim3In_t *in, CanShim3Out_t *out);

#endif /* CAN_SHIM_3_H */

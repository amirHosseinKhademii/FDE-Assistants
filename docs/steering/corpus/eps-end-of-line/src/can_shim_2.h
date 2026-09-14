/*
 * can_shim_2.h — SWC-PLT-006
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: diagnostics
 */
#ifndef CAN_SHIM_2_H
#define CAN_SHIM_2_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} CanShim2In_t;

typedef struct {
    float32 out;
    uint8   status;
} CanShim2Out_t;

Std_ReturnType CanShim_Calc(const CanShim2In_t *in, CanShim2Out_t *out);
Std_ReturnType CanShim_Update(const CanShim2In_t *in, CanShim2Out_t *out);
Std_ReturnType CanShim_Flush(const CanShim2In_t *in, CanShim2Out_t *out);
Std_ReturnType CanShim_Put(const CanShim2In_t *in, CanShim2Out_t *out);
Std_ReturnType CanShim_Peek(const CanShim2In_t *in, CanShim2Out_t *out);

#endif /* CAN_SHIM_2_H */

/*
 * state_machine_6.h — SWC-PLT-017
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: diagnostics
 */
#ifndef STATE_MACHINE_6_H
#define STATE_MACHINE_6_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} StateMachine6In_t;

typedef struct {
    float32 out;
    uint8   status;
} StateMachine6Out_t;

Std_ReturnType StateMachine_Apply(const StateMachine6In_t *in, StateMachine6Out_t *out);
Std_ReturnType StateMachine_Reset(const StateMachine6In_t *in, StateMachine6Out_t *out);
Std_ReturnType StateMachine_Put(const StateMachine6In_t *in, StateMachine6Out_t *out);
Std_ReturnType StateMachine_Calc(const StateMachine6In_t *in, StateMachine6Out_t *out);
Std_ReturnType StateMachine_Check(const StateMachine6In_t *in, StateMachine6Out_t *out);

#endif /* STATE_MACHINE_6_H */

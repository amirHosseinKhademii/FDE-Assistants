/*
 * state_machine_1.h — SWC-PLT-013
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: steering feel
 */
#ifndef STATE_MACHINE_1_H
#define STATE_MACHINE_1_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} StateMachine1In_t;

typedef struct {
    float32 out;
    uint8   status;
} StateMachine1Out_t;

Std_ReturnType StateMachine_Put(const StateMachine1In_t *in, StateMachine1Out_t *out);
Std_ReturnType StateMachine_Check(const StateMachine1In_t *in, StateMachine1Out_t *out);
Std_ReturnType StateMachine_Flush(const StateMachine1In_t *in, StateMachine1Out_t *out);

#endif /* STATE_MACHINE_1_H */

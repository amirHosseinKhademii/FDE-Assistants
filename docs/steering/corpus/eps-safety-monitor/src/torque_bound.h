/*
 * torque_bound.h — SWC-SAFEMON
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: functional safety
 */
#ifndef TORQUE_BOUND_H
#define TORQUE_BOUND_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} TorqueBoundIn_t;

typedef struct {
    float32 out;
    uint8   status;
} TorqueBoundOut_t;

Std_ReturnType Bound_Init(void);
Std_ReturnType Bound_Check(const TorqueBoundIn_t *in, TorqueBoundOut_t *out);
Std_ReturnType Bound_Trip(const TorqueBoundIn_t *in, TorqueBoundOut_t *out);

#endif /* TORQUE_BOUND_H */

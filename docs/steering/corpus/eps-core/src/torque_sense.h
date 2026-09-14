/*
 * torque_sense.h — SWC-TRQSENS
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: control
 */
#ifndef TORQUE_SENSE_H
#define TORQUE_SENSE_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} TorqueSenseIn_t;

typedef struct {
    float32 out;
    uint8   status;
} TorqueSenseOut_t;

Std_ReturnType TrqSens_Init(void);
Std_ReturnType TrqSens_Read(const TorqueSenseIn_t *in, TorqueSenseOut_t *out);
Std_ReturnType TrqSens_Plausibilise(const TorqueSenseIn_t *in, TorqueSenseOut_t *out);
Std_ReturnType TrqSens_Filter(const TorqueSenseIn_t *in, TorqueSenseOut_t *out);

#endif /* TORQUE_SENSE_H */

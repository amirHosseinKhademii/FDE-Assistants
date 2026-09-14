/*
 * road_wheel_actuator.h — SWC-PLT-010
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: control
 */
#ifndef ROAD_WHEEL_ACTUATOR_H
#define ROAD_WHEEL_ACTUATOR_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} RoadWheelActuatorIn_t;

typedef struct {
    float32 out;
    uint8   status;
} RoadWheelActuatorOut_t;

Std_ReturnType Rwa_Init(void);
Std_ReturnType Rwa_Track(const RoadWheelActuatorIn_t *in, RoadWheelActuatorOut_t *out);
Std_ReturnType Rwa_Fault(const RoadWheelActuatorIn_t *in, RoadWheelActuatorOut_t *out);

#endif /* ROAD_WHEEL_ACTUATOR_H */

/*
 * veh_speed.h — SWC-ARB
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: control
 */
#ifndef VEH_SPEED_H
#define VEH_SPEED_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} VehSpeedIn_t;

typedef struct {
    float32 out;
    uint8   status;
} VehSpeedOut_t;

Std_ReturnType VehSpd_Read(const VehSpeedIn_t *in, VehSpeedOut_t *out);
Std_ReturnType VehSpd_CheckStaleness(const VehSpeedIn_t *in, VehSpeedOut_t *out);
Std_ReturnType VehSpd_Fallback(const VehSpeedIn_t *in, VehSpeedOut_t *out);

#endif /* VEH_SPEED_H */

/*
 * feedback_actuator.h — SWC-PLT-011
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: control
 */
#ifndef FEEDBACK_ACTUATOR_H
#define FEEDBACK_ACTUATOR_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} FeedbackActuatorIn_t;

typedef struct {
    float32 out;
    uint8   status;
} FeedbackActuatorOut_t;

Std_ReturnType Fba_Init(void);
Std_ReturnType Fba_Render(const FeedbackActuatorIn_t *in, FeedbackActuatorOut_t *out);
Std_ReturnType Fba_Fault(const FeedbackActuatorIn_t *in, FeedbackActuatorOut_t *out);

#endif /* FEEDBACK_ACTUATOR_H */

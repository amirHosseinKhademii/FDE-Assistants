/*
 * assist.h — SWC-ASSIST
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: control
 */
#ifndef ASSIST_H
#define ASSIST_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} AssistIn_t;

typedef struct {
    float32 out;
    uint8   status;
} AssistOut_t;

Std_ReturnType Assist_Init(void);
Std_ReturnType Assist_CalcBase(const AssistIn_t *in, AssistOut_t *out);
Std_ReturnType Assist_ApplySpeedScale(const AssistIn_t *in, AssistOut_t *out);
Std_ReturnType Assist_Limit(const AssistIn_t *in, AssistOut_t *out);
Std_ReturnType Assist_MainRunnable(const AssistIn_t *in, AssistOut_t *out);

#endif /* ASSIST_H */

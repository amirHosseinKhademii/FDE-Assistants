/*
 * foc.h — SWC-MOTCTL
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: motor control
 */
#ifndef FOC_H
#define FOC_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} FocIn_t;

typedef struct {
    float32 out;
    uint8   status;
} FocOut_t;

Std_ReturnType Foc_Init(void);
Std_ReturnType Foc_Park(const FocIn_t *in, FocOut_t *out);
Std_ReturnType Foc_Clarke(const FocIn_t *in, FocOut_t *out);
Std_ReturnType Foc_CurrentLoop(const FocIn_t *in, FocOut_t *out);
Std_ReturnType Foc_Pwm(const FocIn_t *in, FocOut_t *out);

#endif /* FOC_H */

/*
 * watchdog.h — SWC-SAFEMON
 *
 * ASIL: D   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: functional safety
 */
#ifndef WATCHDOG_H
#define WATCHDOG_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} WatchdogIn_t;

typedef struct {
    float32 out;
    uint8   status;
} WatchdogOut_t;

Std_ReturnType Wdg_Init(void);
Std_ReturnType Wdg_Kick(const WatchdogIn_t *in, WatchdogOut_t *out);
Std_ReturnType Wdg_Expire(const WatchdogIn_t *in, WatchdogOut_t *out);

#endif /* WATCHDOG_H */

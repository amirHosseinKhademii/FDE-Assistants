/*
 * rtc.h — SWC-RTC
 *
 * ASIL: B   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: steering feel
 */
#ifndef RTC_H
#define RTC_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} RtcIn_t;

typedef struct {
    float32 out;
    uint8   status;
} RtcOut_t;

Std_ReturnType Rtc_Init(void);
Std_ReturnType Rtc_CalcReturn(const RtcIn_t *in, RtcOut_t *out);
Std_ReturnType Rtc_Blend(const RtcIn_t *in, RtcOut_t *out);

#endif /* RTC_H */

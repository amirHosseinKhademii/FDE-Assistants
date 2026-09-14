/*
 * dtc.h — SWC-DIAG
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: diagnostics
 */
#ifndef DTC_H
#define DTC_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} DtcIn_t;

typedef struct {
    float32 out;
    uint8   status;
} DtcOut_t;

Std_ReturnType Dtc_Init(void);
Std_ReturnType Dtc_Set(const DtcIn_t *in, DtcOut_t *out);
Std_ReturnType Dtc_Clear(const DtcIn_t *in, DtcOut_t *out);
Std_ReturnType Dtc_Report(const DtcIn_t *in, DtcOut_t *out);

#endif /* DTC_H */

/*
 * a2l_export.h — SWC-PLT-001
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: calibration
 */
#ifndef A2L_EXPORT_H
#define A2L_EXPORT_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} A2lExportIn_t;

typedef struct {
    float32 out;
    uint8   status;
} A2lExportOut_t;

Std_ReturnType A2l_Load(const A2lExportIn_t *in, A2lExportOut_t *out);
Std_ReturnType A2l_Export(const A2lExportIn_t *in, A2lExportOut_t *out);
Std_ReturnType A2l_Merge(const A2lExportIn_t *in, A2lExportOut_t *out);

#endif /* A2L_EXPORT_H */

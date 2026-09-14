/*
 * dataset.h — SWC-PLT-002
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: calibration
 */
#ifndef DATASET_H
#define DATASET_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} DatasetIn_t;

typedef struct {
    float32 out;
    uint8   status;
} DatasetOut_t;

Std_ReturnType Ds_Open(const DatasetIn_t *in, DatasetOut_t *out);
Std_ReturnType Ds_Diff(const DatasetIn_t *in, DatasetOut_t *out);
Std_ReturnType Ds_Apply(const DatasetIn_t *in, DatasetOut_t *out);

#endif /* DATASET_H */

/*
 * snapshot.h — SWC-DIAG
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: diagnostics
 */
#ifndef SNAPSHOT_H
#define SNAPSHOT_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
} SnapshotIn_t;

typedef struct {
    float32 out;
    uint8   status;
} SnapshotOut_t;

Std_ReturnType Snap_Capture(const SnapshotIn_t *in, SnapshotOut_t *out);
Std_ReturnType Snap_Store(const SnapshotIn_t *in, SnapshotOut_t *out);

#endif /* SNAPSHOT_H */

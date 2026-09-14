/*
 * nvm_block_2.h — SWC-PLT-023
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: motor control
 */
#ifndef NVM_BLOCK_2_H
#define NVM_BLOCK_2_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} NvmBlock2In_t;

typedef struct {
    float32 out;
    uint8   status;
} NvmBlock2Out_t;

Std_ReturnType NvmBlock_Flush(const NvmBlock2In_t *in, NvmBlock2Out_t *out);
Std_ReturnType NvmBlock_Calc(const NvmBlock2In_t *in, NvmBlock2Out_t *out);
Std_ReturnType NvmBlock_Update(const NvmBlock2In_t *in, NvmBlock2Out_t *out);
Std_ReturnType NvmBlock_Check(const NvmBlock2In_t *in, NvmBlock2Out_t *out);

#endif /* NVM_BLOCK_2_H */

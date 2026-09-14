/*
 * nvm_block_8.h — SWC-PLT-019
 *
 * ASIL: QM   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: motor control
 */
#ifndef NVM_BLOCK_8_H
#define NVM_BLOCK_8_H

#include "Std_Types.h"

typedef struct {
    float32 in0;
    float32 in1;
    float32 in2;
} NvmBlock8In_t;

typedef struct {
    float32 out;
    uint8   status;
} NvmBlock8Out_t;

Std_ReturnType NvmBlock_Get(const NvmBlock8In_t *in, NvmBlock8Out_t *out);
Std_ReturnType NvmBlock_Put(const NvmBlock8In_t *in, NvmBlock8Out_t *out);
Std_ReturnType NvmBlock_Init(void);
Std_ReturnType NvmBlock_Apply(const NvmBlock8In_t *in, NvmBlock8Out_t *out);

#endif /* NVM_BLOCK_8_H */

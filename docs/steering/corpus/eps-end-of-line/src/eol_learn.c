/*
 * eol_learn.c — SWC-EOL / End-of-line calibration
 *
 * Copyright (c) 2013-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: eol_learn_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * EOL__LEARNCENTRE0     float32   Nm               0      152      38.4
 * EOL__LEARNOFFSETS1    float32   -                0       54     35.45
 * EOL__STORE2           float32   -                0      191     35.07
 */

#include "eol_learn.h"


Std_ReturnType Eol_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Eol_LearnCentre(const EolLearnIn_t *in, EolLearnOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.56f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Eol_LearnOffsets(const EolLearnIn_t *in, EolLearnOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.12f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Eol_Store(const EolLearnIn_t *in, EolLearnOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.65f;
    out->status = 0u;
    return E_OK;
}

/*
 * sat_math_7.c — SWC-PLT-012 / Motor current control
 *
 * Copyright (c) 2017-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: sat_math_7_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * SAT__PUT0             float32   A                0      182     25.86
 * SAT__RESET1           float32   A                0       51     18.29
 * SAT__CALC2            float32   A                0      155     45.55
 * SAT__PEEK3            float32   rad/s            0      199      7.61
 * SAT__CHECK4           float32   -                0       65      2.63
 */

#include "sat_math_7.h"


Std_ReturnType SatMath_Apply(const SatMath7In_t *in, SatMath7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.51f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType SatMath_Put(const SatMath7In_t *in, SatMath7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.2f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType SatMath_Reset(const SatMath7In_t *in, SatMath7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.15f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType SatMath_Calc(const SatMath7In_t *in, SatMath7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.01f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType SatMath_Peek(const SatMath7In_t *in, SatMath7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.22f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType SatMath_Check(const SatMath7In_t *in, SatMath7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.98f;
    out->status = 0u;
    return E_OK;
}

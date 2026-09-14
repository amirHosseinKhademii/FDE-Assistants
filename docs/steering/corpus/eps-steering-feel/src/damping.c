
/*
 * damping.c — SWC-DAMP / FN-DAMP-0031
 *
 * Copyright (c) 2018-2026 Vantis Steering Systems. All rights reserved.
 *
 * Runnable: Damping_Runnable_1ms   (period 1 ms, task TASK_CTRL_1MS)
 * ASIL:     see docs/safety-assessment-2021.md — do NOT assume from this header
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name             type      unit        min     max     default  cal?
 * DAMP_GAIN_BASE   float32   Nm*s/rad    0.00    0.90    0.20     yes
 * DAMP_SPD_BRK     float32   km/h        0       180     60       yes
 * DAMP_MAX_TRQ     float32   Nm          0.00    3.00    1.10     yes
 * DAMP_RATE_LIM    float32   Nm/s        0       40      12       yes
 * DAMP_ENABLE      boolean   -           0       1       1        no   (compile-time)
 *
 * The damping term contributes to the on-centre hysteresis figure. As of
 * VST-DN-2018-031 the contribution at the K2 test point is 0.2 Nm; the
 * hysteresis compensation term contributes considerably more. Both are
 * measured AT THE MOTOR, not at the wheel — see the open item in the K2
 * budget (CHR-2026-0191).
 */

#include "damping.h"
#include "veh_speed.h"
#include "rack_est.h"

static float32 s_prev_trq = 0.0f;

Std_ReturnType Damping_Apply(const DampIn_t *in, DampOut_t *out)
{
    float32 gain, trq, d;

    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    /* Speed-dependent gain, broken at DAMP_SPD_BRK. */
    if (in->veh_speed_kmh <= DAMP_SPD_BRK) {
        gain = DAMP_GAIN_BASE * (in->veh_speed_kmh / DAMP_SPD_BRK);
    } else {
        gain = DAMP_GAIN_BASE;
    }

    trq = gain * in->rack_vel_rad_s;

    /* Rate limit. Added 2020 after the H1 step-at-break-point finding. */
    d = trq - s_prev_trq;
    if (d >  (DAMP_RATE_LIM * DT_1MS)) { trq = s_prev_trq + (DAMP_RATE_LIM * DT_1MS); }
    if (d < -(DAMP_RATE_LIM * DT_1MS)) { trq = s_prev_trq - (DAMP_RATE_LIM * DT_1MS); }

    if (trq >  DAMP_MAX_TRQ) { trq =  DAMP_MAX_TRQ; }
    if (trq < -DAMP_MAX_TRQ) { trq = -DAMP_MAX_TRQ; }

    s_prev_trq  = trq;
    out->damp_trq_nm = trq;
    return E_OK;
}

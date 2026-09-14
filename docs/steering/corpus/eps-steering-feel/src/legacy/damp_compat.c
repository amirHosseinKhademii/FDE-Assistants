
/*
 * damp_compat.c — compatibility shim for pre-2018 integrations.
 *
 * The function was called DampApply() until the 2018 naming cleanup. Two
 * programmes still integrate against the old symbol. Do not delete before
 * 2027-01-01; see TICKET VST-4471.
 */
#include "damping.h"

Std_ReturnType DampApply(const DampIn_t *in, DampOut_t *out)
{
    return Damping_Apply(in, out);
}

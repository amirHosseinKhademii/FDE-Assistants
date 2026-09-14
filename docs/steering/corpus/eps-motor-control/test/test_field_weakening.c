/*
 * test_field_weakening.c — unit tests for SWC-MOTCTL
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2018 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "field_weakening.h"


void test_Fw_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Fw_Calc(NULL_PTR, NULL_PTR));
}

void test_Fw_Calc_holds_at_zero(void)
{
    FieldWeakeningIn_t  in  = { 0 };
    FieldWeakeningOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Fw_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

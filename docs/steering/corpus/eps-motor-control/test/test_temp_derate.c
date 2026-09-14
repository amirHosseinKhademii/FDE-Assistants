/*
 * test_temp_derate.c — unit tests for SWC-MOTCTL
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2015 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "temp_derate.h"


void test_Derate_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Derate_Apply(NULL_PTR, NULL_PTR));
}

void test_Derate_Apply_is_symmetric(void)
{
    TempDerateIn_t  in  = { 0 };
    TempDerateOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Derate_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

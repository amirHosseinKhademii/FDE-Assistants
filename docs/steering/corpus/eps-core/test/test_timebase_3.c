/*
 * test_timebase_3.c — unit tests for SWC-PLT-011
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2020 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "timebase_3.h"


void test_Timebase_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Timebase_Check(NULL_PTR, NULL_PTR));
}

void test_Timebase_Check_is_symmetric(void)
{
    Timebase3In_t  in  = { 0 };
    Timebase3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Timebase_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Timebase_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Timebase_Calc(NULL_PTR, NULL_PTR));
}

void test_Timebase_Calc_is_symmetric(void)
{
    Timebase3In_t  in  = { 0 };
    Timebase3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Timebase_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Timebase_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Timebase_Apply(NULL_PTR, NULL_PTR));
}

void test_Timebase_Apply_saturates_at_limit(void)
{
    Timebase3In_t  in  = { 0 };
    Timebase3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Timebase_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

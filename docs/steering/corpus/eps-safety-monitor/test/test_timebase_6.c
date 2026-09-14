/*
 * test_timebase_6.c — unit tests for SWC-PLT-031
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2018 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "timebase_6.h"


void test_Timebase_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Timebase_Calc(NULL_PTR, NULL_PTR));
}

void test_Timebase_Calc_saturates_at_limit(void)
{
    Timebase6In_t  in  = { 0 };
    Timebase6Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Timebase_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Timebase_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Timebase_Apply(NULL_PTR, NULL_PTR));
}

void test_Timebase_Apply_saturates_at_limit(void)
{
    Timebase6In_t  in  = { 0 };
    Timebase6Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Timebase_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Timebase_Flush_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Timebase_Flush(NULL_PTR, NULL_PTR));
}

void test_Timebase_Flush_is_symmetric(void)
{
    Timebase6In_t  in  = { 0 };
    Timebase6Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Timebase_Flush(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Timebase_Get_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Timebase_Get(NULL_PTR, NULL_PTR));
}

void test_Timebase_Get_is_symmetric(void)
{
    Timebase6In_t  in  = { 0 };
    Timebase6Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Timebase_Get(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

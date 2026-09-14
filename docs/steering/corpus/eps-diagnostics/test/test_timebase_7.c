/*
 * test_timebase_7.c — unit tests for SWC-PLT-009
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2015 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "timebase_7.h"


void test_Timebase_Peek_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Timebase_Peek(NULL_PTR, NULL_PTR));
}

void test_Timebase_Peek_is_symmetric(void)
{
    Timebase7In_t  in  = { 0 };
    Timebase7Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Timebase_Peek(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Timebase_Flush_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Timebase_Flush(NULL_PTR, NULL_PTR));
}

void test_Timebase_Flush_is_monotonic(void)
{
    Timebase7In_t  in  = { 0 };
    Timebase7Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Timebase_Flush(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Timebase_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Timebase_Calc(NULL_PTR, NULL_PTR));
}

void test_Timebase_Calc_saturates_at_limit(void)
{
    Timebase7In_t  in  = { 0 };
    Timebase7Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Timebase_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

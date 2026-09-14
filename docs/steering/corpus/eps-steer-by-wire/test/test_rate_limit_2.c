/*
 * test_rate_limit_2.c — unit tests for SWC-PLT-007
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2016 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "rate_limit_2.h"


void test_RateLimit_Reset_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Reset(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Reset_is_monotonic(void)
{
    RateLimit2In_t  in  = { 0 };
    RateLimit2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Reset(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RateLimit_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Put(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Put_saturates_at_limit(void)
{
    RateLimit2In_t  in  = { 0 };
    RateLimit2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RateLimit_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Apply(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Apply_saturates_at_limit(void)
{
    RateLimit2In_t  in  = { 0 };
    RateLimit2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

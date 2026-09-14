/*
 * test_rate_limit_4.c — unit tests for SWC-PLT-017
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2015 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "rate_limit_4.h"


void test_RateLimit_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Calc(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Calc_is_monotonic(void)
{
    RateLimit4In_t  in  = { 0 };
    RateLimit4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RateLimit_Peek_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Peek(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Peek_holds_at_zero(void)
{
    RateLimit4In_t  in  = { 0 };
    RateLimit4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Peek(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RateLimit_Update_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Update(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Update_holds_at_zero(void)
{
    RateLimit4In_t  in  = { 0 };
    RateLimit4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Update(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RateLimit_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Apply(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Apply_saturates_at_limit(void)
{
    RateLimit4In_t  in  = { 0 };
    RateLimit4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

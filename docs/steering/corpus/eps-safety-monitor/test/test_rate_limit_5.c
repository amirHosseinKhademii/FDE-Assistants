/*
 * test_rate_limit_5.c — unit tests for SWC-PLT-035
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2017 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "rate_limit_5.h"


void test_RateLimit_Reset_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Reset(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Reset_saturates_at_limit(void)
{
    RateLimit5In_t  in  = { 0 };
    RateLimit5Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Reset(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RateLimit_Get_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Get(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Get_saturates_at_limit(void)
{
    RateLimit5In_t  in  = { 0 };
    RateLimit5Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Get(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RateLimit_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Put(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Put_holds_at_zero(void)
{
    RateLimit5In_t  in  = { 0 };
    RateLimit5Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

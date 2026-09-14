/*
 * test_rate_limit_3.c — unit tests for SWC-PLT-023
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2020 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "rate_limit_3.h"


void test_RateLimit_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Check(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Check_is_symmetric(void)
{
    RateLimit3In_t  in  = { 0 };
    RateLimit3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RateLimit_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Put(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Put_holds_at_zero(void)
{
    RateLimit3In_t  in  = { 0 };
    RateLimit3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RateLimit_Get_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Get(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Get_is_monotonic(void)
{
    RateLimit3In_t  in  = { 0 };
    RateLimit3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Get(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

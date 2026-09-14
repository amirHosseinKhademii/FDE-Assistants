/*
 * test_rate_limit_1.c — unit tests for SWC-PLT-022
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2020 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "rate_limit_1.h"


void test_RateLimit_Flush_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Flush(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Flush_is_monotonic(void)
{
    RateLimit1In_t  in  = { 0 };
    RateLimit1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Flush(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RateLimit_Update_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Update(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Update_is_monotonic(void)
{
    RateLimit1In_t  in  = { 0 };
    RateLimit1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Update(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RateLimit_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Calc(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Calc_is_symmetric(void)
{
    RateLimit1In_t  in  = { 0 };
    RateLimit1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RateLimit_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Apply(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Apply_saturates_at_limit(void)
{
    RateLimit1In_t  in  = { 0 };
    RateLimit1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RateLimit_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Put(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Put_is_monotonic(void)
{
    RateLimit1In_t  in  = { 0 };
    RateLimit1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RateLimit_Get_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RateLimit_Get(NULL_PTR, NULL_PTR));
}

void test_RateLimit_Get_holds_at_zero(void)
{
    RateLimit1In_t  in  = { 0 };
    RateLimit1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RateLimit_Get(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

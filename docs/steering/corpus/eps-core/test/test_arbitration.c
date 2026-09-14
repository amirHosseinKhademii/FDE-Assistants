/*
 * test_arbitration.c — unit tests for SWC-ARB
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2018 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "arbitration.h"


void test_Arb_Select_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Arb_Select(NULL_PTR, NULL_PTR));
}

void test_Arb_Select_is_monotonic(void)
{
    ArbitrationIn_t  in  = { 0 };
    ArbitrationOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Arb_Select(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Arb_RateLimit_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Arb_RateLimit(NULL_PTR, NULL_PTR));
}

void test_Arb_RateLimit_is_monotonic(void)
{
    ArbitrationIn_t  in  = { 0 };
    ArbitrationOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Arb_RateLimit(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Arb_MainRunnable_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Arb_MainRunnable(NULL_PTR, NULL_PTR));
}

void test_Arb_MainRunnable_is_monotonic(void)
{
    ArbitrationIn_t  in  = { 0 };
    ArbitrationOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Arb_MainRunnable(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

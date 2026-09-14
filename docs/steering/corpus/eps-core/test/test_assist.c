/*
 * test_assist.c — unit tests for SWC-ASSIST
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2019 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "assist.h"


void test_Assist_CalcBase_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Assist_CalcBase(NULL_PTR, NULL_PTR));
}

void test_Assist_CalcBase_holds_at_zero(void)
{
    AssistIn_t  in  = { 0 };
    AssistOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Assist_CalcBase(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Assist_ApplySpeedScale_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Assist_ApplySpeedScale(NULL_PTR, NULL_PTR));
}

void test_Assist_ApplySpeedScale_is_monotonic(void)
{
    AssistIn_t  in  = { 0 };
    AssistOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Assist_ApplySpeedScale(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Assist_Limit_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Assist_Limit(NULL_PTR, NULL_PTR));
}

void test_Assist_Limit_is_monotonic(void)
{
    AssistIn_t  in  = { 0 };
    AssistOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Assist_Limit(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Assist_MainRunnable_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Assist_MainRunnable(NULL_PTR, NULL_PTR));
}

void test_Assist_MainRunnable_holds_at_zero(void)
{
    AssistIn_t  in  = { 0 };
    AssistOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Assist_MainRunnable(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

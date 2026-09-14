/*
 * test_fixpt_4.c — unit tests for SWC-PLT-001
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2020 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "fixpt_4.h"


void test_Fixpt_Peek_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Fixpt_Peek(NULL_PTR, NULL_PTR));
}

void test_Fixpt_Peek_saturates_at_limit(void)
{
    Fixpt4In_t  in  = { 0 };
    Fixpt4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Fixpt_Peek(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Fixpt_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Fixpt_Apply(NULL_PTR, NULL_PTR));
}

void test_Fixpt_Apply_holds_at_zero(void)
{
    Fixpt4In_t  in  = { 0 };
    Fixpt4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Fixpt_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Fixpt_Update_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Fixpt_Update(NULL_PTR, NULL_PTR));
}

void test_Fixpt_Update_is_monotonic(void)
{
    Fixpt4In_t  in  = { 0 };
    Fixpt4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Fixpt_Update(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Fixpt_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Fixpt_Calc(NULL_PTR, NULL_PTR));
}

void test_Fixpt_Calc_holds_at_zero(void)
{
    Fixpt4In_t  in  = { 0 };
    Fixpt4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Fixpt_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

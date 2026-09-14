/*
 * test_debounce_4.c — unit tests for SWC-PLT-002
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2015 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "debounce_4.h"


void test_Debounce_Flush_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Debounce_Flush(NULL_PTR, NULL_PTR));
}

void test_Debounce_Flush_is_symmetric(void)
{
    Debounce4In_t  in  = { 0 };
    Debounce4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Debounce_Flush(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Debounce_Peek_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Debounce_Peek(NULL_PTR, NULL_PTR));
}

void test_Debounce_Peek_is_monotonic(void)
{
    Debounce4In_t  in  = { 0 };
    Debounce4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Debounce_Peek(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Debounce_Update_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Debounce_Update(NULL_PTR, NULL_PTR));
}

void test_Debounce_Update_holds_at_zero(void)
{
    Debounce4In_t  in  = { 0 };
    Debounce4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Debounce_Update(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Debounce_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Debounce_Check(NULL_PTR, NULL_PTR));
}

void test_Debounce_Check_saturates_at_limit(void)
{
    Debounce4In_t  in  = { 0 };
    Debounce4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Debounce_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

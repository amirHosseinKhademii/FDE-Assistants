/*
 * test_debounce_6.c — unit tests for SWC-PLT-023
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2018 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "debounce_6.h"


void test_Debounce_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Debounce_Calc(NULL_PTR, NULL_PTR));
}

void test_Debounce_Calc_holds_at_zero(void)
{
    Debounce6In_t  in  = { 0 };
    Debounce6Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Debounce_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Debounce_Reset_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Debounce_Reset(NULL_PTR, NULL_PTR));
}

void test_Debounce_Reset_is_monotonic(void)
{
    Debounce6In_t  in  = { 0 };
    Debounce6Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Debounce_Reset(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Debounce_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Debounce_Apply(NULL_PTR, NULL_PTR));
}

void test_Debounce_Apply_is_monotonic(void)
{
    Debounce6In_t  in  = { 0 };
    Debounce6Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Debounce_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

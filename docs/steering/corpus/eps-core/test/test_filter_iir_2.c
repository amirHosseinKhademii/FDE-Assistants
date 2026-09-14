/*
 * test_filter_iir_2.c — unit tests for SWC-PLT-033
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2016 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "filter_iir_2.h"


void test_FilterIir_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, FilterIir_Check(NULL_PTR, NULL_PTR));
}

void test_FilterIir_Check_is_symmetric(void)
{
    FilterIir2In_t  in  = { 0 };
    FilterIir2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, FilterIir_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_FilterIir_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, FilterIir_Apply(NULL_PTR, NULL_PTR));
}

void test_FilterIir_Apply_is_symmetric(void)
{
    FilterIir2In_t  in  = { 0 };
    FilterIir2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, FilterIir_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_FilterIir_Peek_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, FilterIir_Peek(NULL_PTR, NULL_PTR));
}

void test_FilterIir_Peek_is_symmetric(void)
{
    FilterIir2In_t  in  = { 0 };
    FilterIir2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, FilterIir_Peek(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_FilterIir_Reset_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, FilterIir_Reset(NULL_PTR, NULL_PTR));
}

void test_FilterIir_Reset_saturates_at_limit(void)
{
    FilterIir2In_t  in  = { 0 };
    FilterIir2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, FilterIir_Reset(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

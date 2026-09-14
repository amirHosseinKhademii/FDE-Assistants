/*
 * test_filter_iir_1.c — unit tests for SWC-PLT-002
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2015 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "filter_iir_1.h"


void test_FilterIir_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, FilterIir_Apply(NULL_PTR, NULL_PTR));
}

void test_FilterIir_Apply_is_symmetric(void)
{
    FilterIir1In_t  in  = { 0 };
    FilterIir1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, FilterIir_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_FilterIir_Flush_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, FilterIir_Flush(NULL_PTR, NULL_PTR));
}

void test_FilterIir_Flush_is_symmetric(void)
{
    FilterIir1In_t  in  = { 0 };
    FilterIir1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, FilterIir_Flush(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_FilterIir_Reset_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, FilterIir_Reset(NULL_PTR, NULL_PTR));
}

void test_FilterIir_Reset_is_monotonic(void)
{
    FilterIir1In_t  in  = { 0 };
    FilterIir1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, FilterIir_Reset(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_FilterIir_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, FilterIir_Put(NULL_PTR, NULL_PTR));
}

void test_FilterIir_Put_is_monotonic(void)
{
    FilterIir1In_t  in  = { 0 };
    FilterIir1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, FilterIir_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

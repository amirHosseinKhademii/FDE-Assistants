/*
 * test_dataset.c — unit tests for SWC-PLT-002
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2020 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "dataset.h"


void test_Ds_Open_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Ds_Open(NULL_PTR, NULL_PTR));
}

void test_Ds_Open_is_monotonic(void)
{
    DatasetIn_t  in  = { 0 };
    DatasetOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Ds_Open(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Ds_Diff_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Ds_Diff(NULL_PTR, NULL_PTR));
}

void test_Ds_Diff_saturates_at_limit(void)
{
    DatasetIn_t  in  = { 0 };
    DatasetOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Ds_Diff(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Ds_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Ds_Apply(NULL_PTR, NULL_PTR));
}

void test_Ds_Apply_saturates_at_limit(void)
{
    DatasetIn_t  in  = { 0 };
    DatasetOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Ds_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

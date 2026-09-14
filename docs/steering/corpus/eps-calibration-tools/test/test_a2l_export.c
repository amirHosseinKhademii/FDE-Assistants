/*
 * test_a2l_export.c — unit tests for SWC-PLT-001
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2018 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "a2l_export.h"


void test_A2l_Load_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, A2l_Load(NULL_PTR, NULL_PTR));
}

void test_A2l_Load_is_symmetric(void)
{
    A2lExportIn_t  in  = { 0 };
    A2lExportOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, A2l_Load(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_A2l_Export_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, A2l_Export(NULL_PTR, NULL_PTR));
}

void test_A2l_Export_is_symmetric(void)
{
    A2lExportIn_t  in  = { 0 };
    A2lExportOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, A2l_Export(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_A2l_Merge_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, A2l_Merge(NULL_PTR, NULL_PTR));
}

void test_A2l_Merge_holds_at_zero(void)
{
    A2lExportIn_t  in  = { 0 };
    A2lExportOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, A2l_Merge(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

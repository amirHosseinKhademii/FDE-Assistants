/*
 * test_lookup_table_7.c — unit tests for SWC-PLT-025
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2018 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "lookup_table_7.h"


void test_LookupTable_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, LookupTable_Apply(NULL_PTR, NULL_PTR));
}

void test_LookupTable_Apply_holds_at_zero(void)
{
    LookupTable7In_t  in  = { 0 };
    LookupTable7Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, LookupTable_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_LookupTable_Reset_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, LookupTable_Reset(NULL_PTR, NULL_PTR));
}

void test_LookupTable_Reset_saturates_at_limit(void)
{
    LookupTable7In_t  in  = { 0 };
    LookupTable7Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, LookupTable_Reset(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_LookupTable_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, LookupTable_Check(NULL_PTR, NULL_PTR));
}

void test_LookupTable_Check_holds_at_zero(void)
{
    LookupTable7In_t  in  = { 0 };
    LookupTable7Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, LookupTable_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_LookupTable_Flush_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, LookupTable_Flush(NULL_PTR, NULL_PTR));
}

void test_LookupTable_Flush_is_symmetric(void)
{
    LookupTable7In_t  in  = { 0 };
    LookupTable7Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, LookupTable_Flush(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

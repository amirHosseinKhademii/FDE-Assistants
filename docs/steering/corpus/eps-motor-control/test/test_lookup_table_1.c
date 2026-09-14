/*
 * test_lookup_table_1.c — unit tests for SWC-PLT-009
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2019 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "lookup_table_1.h"


void test_LookupTable_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, LookupTable_Put(NULL_PTR, NULL_PTR));
}

void test_LookupTable_Put_is_monotonic(void)
{
    LookupTable1In_t  in  = { 0 };
    LookupTable1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, LookupTable_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_LookupTable_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, LookupTable_Check(NULL_PTR, NULL_PTR));
}

void test_LookupTable_Check_holds_at_zero(void)
{
    LookupTable1In_t  in  = { 0 };
    LookupTable1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, LookupTable_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_LookupTable_Flush_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, LookupTable_Flush(NULL_PTR, NULL_PTR));
}

void test_LookupTable_Flush_is_symmetric(void)
{
    LookupTable1In_t  in  = { 0 };
    LookupTable1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, LookupTable_Flush(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_LookupTable_Get_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, LookupTable_Get(NULL_PTR, NULL_PTR));
}

void test_LookupTable_Get_is_symmetric(void)
{
    LookupTable1In_t  in  = { 0 };
    LookupTable1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, LookupTable_Get(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

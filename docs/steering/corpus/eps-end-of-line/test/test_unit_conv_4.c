/*
 * test_unit_conv_4.c — unit tests for SWC-PLT-001
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2015 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "unit_conv_4.h"


void test_UnitConv_Get_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, UnitConv_Get(NULL_PTR, NULL_PTR));
}

void test_UnitConv_Get_saturates_at_limit(void)
{
    UnitConv4In_t  in  = { 0 };
    UnitConv4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, UnitConv_Get(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_UnitConv_Reset_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, UnitConv_Reset(NULL_PTR, NULL_PTR));
}

void test_UnitConv_Reset_saturates_at_limit(void)
{
    UnitConv4In_t  in  = { 0 };
    UnitConv4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, UnitConv_Reset(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_UnitConv_Peek_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, UnitConv_Peek(NULL_PTR, NULL_PTR));
}

void test_UnitConv_Peek_holds_at_zero(void)
{
    UnitConv4In_t  in  = { 0 };
    UnitConv4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, UnitConv_Peek(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

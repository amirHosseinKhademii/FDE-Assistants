/*
 * test_unit_conv_3.c — unit tests for SWC-PLT-030
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2016 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "unit_conv_3.h"


void test_UnitConv_Peek_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, UnitConv_Peek(NULL_PTR, NULL_PTR));
}

void test_UnitConv_Peek_saturates_at_limit(void)
{
    UnitConv3In_t  in  = { 0 };
    UnitConv3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, UnitConv_Peek(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_UnitConv_Get_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, UnitConv_Get(NULL_PTR, NULL_PTR));
}

void test_UnitConv_Get_is_monotonic(void)
{
    UnitConv3In_t  in  = { 0 };
    UnitConv3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, UnitConv_Get(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_UnitConv_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, UnitConv_Calc(NULL_PTR, NULL_PTR));
}

void test_UnitConv_Calc_is_symmetric(void)
{
    UnitConv3In_t  in  = { 0 };
    UnitConv3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, UnitConv_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_UnitConv_Reset_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, UnitConv_Reset(NULL_PTR, NULL_PTR));
}

void test_UnitConv_Reset_holds_at_zero(void)
{
    UnitConv3In_t  in  = { 0 };
    UnitConv3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, UnitConv_Reset(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_UnitConv_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, UnitConv_Put(NULL_PTR, NULL_PTR));
}

void test_UnitConv_Put_holds_at_zero(void)
{
    UnitConv3In_t  in  = { 0 };
    UnitConv3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, UnitConv_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

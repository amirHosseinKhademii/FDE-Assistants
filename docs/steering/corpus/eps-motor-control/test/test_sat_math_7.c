/*
 * test_sat_math_7.c — unit tests for SWC-PLT-012
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2016 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "sat_math_7.h"


void test_SatMath_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, SatMath_Apply(NULL_PTR, NULL_PTR));
}

void test_SatMath_Apply_is_symmetric(void)
{
    SatMath7In_t  in  = { 0 };
    SatMath7Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, SatMath_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_SatMath_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, SatMath_Put(NULL_PTR, NULL_PTR));
}

void test_SatMath_Put_saturates_at_limit(void)
{
    SatMath7In_t  in  = { 0 };
    SatMath7Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, SatMath_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_SatMath_Reset_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, SatMath_Reset(NULL_PTR, NULL_PTR));
}

void test_SatMath_Reset_is_symmetric(void)
{
    SatMath7In_t  in  = { 0 };
    SatMath7Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, SatMath_Reset(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_SatMath_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, SatMath_Calc(NULL_PTR, NULL_PTR));
}

void test_SatMath_Calc_saturates_at_limit(void)
{
    SatMath7In_t  in  = { 0 };
    SatMath7Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, SatMath_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_SatMath_Peek_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, SatMath_Peek(NULL_PTR, NULL_PTR));
}

void test_SatMath_Peek_is_symmetric(void)
{
    SatMath7In_t  in  = { 0 };
    SatMath7Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, SatMath_Peek(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_SatMath_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, SatMath_Check(NULL_PTR, NULL_PTR));
}

void test_SatMath_Check_is_symmetric(void)
{
    SatMath7In_t  in  = { 0 };
    SatMath7Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, SatMath_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

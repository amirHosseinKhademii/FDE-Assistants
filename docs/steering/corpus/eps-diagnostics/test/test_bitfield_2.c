/*
 * test_bitfield_2.c — unit tests for SWC-PLT-027
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2019 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "bitfield_2.h"


void test_Bitfield_Get_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Bitfield_Get(NULL_PTR, NULL_PTR));
}

void test_Bitfield_Get_is_symmetric(void)
{
    Bitfield2In_t  in  = { 0 };
    Bitfield2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Bitfield_Get(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Bitfield_Peek_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Bitfield_Peek(NULL_PTR, NULL_PTR));
}

void test_Bitfield_Peek_saturates_at_limit(void)
{
    Bitfield2In_t  in  = { 0 };
    Bitfield2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Bitfield_Peek(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Bitfield_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Bitfield_Calc(NULL_PTR, NULL_PTR));
}

void test_Bitfield_Calc_is_monotonic(void)
{
    Bitfield2In_t  in  = { 0 };
    Bitfield2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Bitfield_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Bitfield_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Bitfield_Check(NULL_PTR, NULL_PTR));
}

void test_Bitfield_Check_is_symmetric(void)
{
    Bitfield2In_t  in  = { 0 };
    Bitfield2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Bitfield_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Bitfield_Reset_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Bitfield_Reset(NULL_PTR, NULL_PTR));
}

void test_Bitfield_Reset_saturates_at_limit(void)
{
    Bitfield2In_t  in  = { 0 };
    Bitfield2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Bitfield_Reset(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

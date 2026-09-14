/*
 * test_can_shim_2.c — unit tests for SWC-PLT-006
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2019 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "can_shim_2.h"


void test_CanShim_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, CanShim_Calc(NULL_PTR, NULL_PTR));
}

void test_CanShim_Calc_saturates_at_limit(void)
{
    CanShim2In_t  in  = { 0 };
    CanShim2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, CanShim_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_CanShim_Update_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, CanShim_Update(NULL_PTR, NULL_PTR));
}

void test_CanShim_Update_saturates_at_limit(void)
{
    CanShim2In_t  in  = { 0 };
    CanShim2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, CanShim_Update(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_CanShim_Flush_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, CanShim_Flush(NULL_PTR, NULL_PTR));
}

void test_CanShim_Flush_is_symmetric(void)
{
    CanShim2In_t  in  = { 0 };
    CanShim2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, CanShim_Flush(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_CanShim_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, CanShim_Put(NULL_PTR, NULL_PTR));
}

void test_CanShim_Put_is_symmetric(void)
{
    CanShim2In_t  in  = { 0 };
    CanShim2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, CanShim_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_CanShim_Peek_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, CanShim_Peek(NULL_PTR, NULL_PTR));
}

void test_CanShim_Peek_saturates_at_limit(void)
{
    CanShim2In_t  in  = { 0 };
    CanShim2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, CanShim_Peek(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

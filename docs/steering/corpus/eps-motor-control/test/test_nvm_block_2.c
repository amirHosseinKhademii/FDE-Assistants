/*
 * test_nvm_block_2.c — unit tests for SWC-PLT-023
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2020 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "nvm_block_2.h"


void test_NvmBlock_Flush_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, NvmBlock_Flush(NULL_PTR, NULL_PTR));
}

void test_NvmBlock_Flush_is_monotonic(void)
{
    NvmBlock2In_t  in  = { 0 };
    NvmBlock2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, NvmBlock_Flush(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_NvmBlock_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, NvmBlock_Calc(NULL_PTR, NULL_PTR));
}

void test_NvmBlock_Calc_saturates_at_limit(void)
{
    NvmBlock2In_t  in  = { 0 };
    NvmBlock2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, NvmBlock_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_NvmBlock_Update_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, NvmBlock_Update(NULL_PTR, NULL_PTR));
}

void test_NvmBlock_Update_is_symmetric(void)
{
    NvmBlock2In_t  in  = { 0 };
    NvmBlock2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, NvmBlock_Update(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_NvmBlock_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, NvmBlock_Check(NULL_PTR, NULL_PTR));
}

void test_NvmBlock_Check_is_symmetric(void)
{
    NvmBlock2In_t  in  = { 0 };
    NvmBlock2Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, NvmBlock_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

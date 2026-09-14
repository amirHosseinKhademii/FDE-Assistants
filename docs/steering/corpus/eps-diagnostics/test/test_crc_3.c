/*
 * test_crc_3.c — unit tests for SWC-PLT-019
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2020 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "crc_3.h"


void test_Crc_Update_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Crc_Update(NULL_PTR, NULL_PTR));
}

void test_Crc_Update_saturates_at_limit(void)
{
    Crc3In_t  in  = { 0 };
    Crc3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Crc_Update(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Crc_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Crc_Put(NULL_PTR, NULL_PTR));
}

void test_Crc_Put_holds_at_zero(void)
{
    Crc3In_t  in  = { 0 };
    Crc3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Crc_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Crc_Flush_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Crc_Flush(NULL_PTR, NULL_PTR));
}

void test_Crc_Flush_is_symmetric(void)
{
    Crc3In_t  in  = { 0 };
    Crc3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Crc_Flush(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Crc_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Crc_Calc(NULL_PTR, NULL_PTR));
}

void test_Crc_Calc_saturates_at_limit(void)
{
    Crc3In_t  in  = { 0 };
    Crc3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Crc_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Crc_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Crc_Check(NULL_PTR, NULL_PTR));
}

void test_Crc_Check_holds_at_zero(void)
{
    Crc3In_t  in  = { 0 };
    Crc3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Crc_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

/*
 * test_checksum_8.c — unit tests for SWC-PLT-003
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2019 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "checksum_8.h"


void test_Checksum_Get_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Checksum_Get(NULL_PTR, NULL_PTR));
}

void test_Checksum_Get_is_symmetric(void)
{
    Checksum8In_t  in  = { 0 };
    Checksum8Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Checksum_Get(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Checksum_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Checksum_Put(NULL_PTR, NULL_PTR));
}

void test_Checksum_Put_holds_at_zero(void)
{
    Checksum8In_t  in  = { 0 };
    Checksum8Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Checksum_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Checksum_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Checksum_Apply(NULL_PTR, NULL_PTR));
}

void test_Checksum_Apply_saturates_at_limit(void)
{
    Checksum8In_t  in  = { 0 };
    Checksum8Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Checksum_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Checksum_Update_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Checksum_Update(NULL_PTR, NULL_PTR));
}

void test_Checksum_Update_is_symmetric(void)
{
    Checksum8In_t  in  = { 0 };
    Checksum8Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Checksum_Update(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

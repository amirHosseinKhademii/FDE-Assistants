/*
 * test_checksum_5.c — unit tests for SWC-PLT-011
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2020 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "checksum_5.h"


void test_Checksum_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Checksum_Calc(NULL_PTR, NULL_PTR));
}

void test_Checksum_Calc_holds_at_zero(void)
{
    Checksum5In_t  in  = { 0 };
    Checksum5Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Checksum_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Checksum_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Checksum_Put(NULL_PTR, NULL_PTR));
}

void test_Checksum_Put_holds_at_zero(void)
{
    Checksum5In_t  in  = { 0 };
    Checksum5Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Checksum_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

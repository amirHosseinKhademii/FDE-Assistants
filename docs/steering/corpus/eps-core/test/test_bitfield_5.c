/*
 * test_bitfield_5.c — unit tests for SWC-PLT-001
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2017 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "bitfield_5.h"


void test_Bitfield_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Bitfield_Put(NULL_PTR, NULL_PTR));
}

void test_Bitfield_Put_holds_at_zero(void)
{
    Bitfield5In_t  in  = { 0 };
    Bitfield5Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Bitfield_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Bitfield_Update_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Bitfield_Update(NULL_PTR, NULL_PTR));
}

void test_Bitfield_Update_is_monotonic(void)
{
    Bitfield5In_t  in  = { 0 };
    Bitfield5Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Bitfield_Update(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Bitfield_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Bitfield_Check(NULL_PTR, NULL_PTR));
}

void test_Bitfield_Check_holds_at_zero(void)
{
    Bitfield5In_t  in  = { 0 };
    Bitfield5Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Bitfield_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

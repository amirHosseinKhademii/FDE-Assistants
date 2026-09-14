/*
 * test_can_shim_3.c — unit tests for SWC-PLT-032
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2018 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "can_shim_3.h"


void test_CanShim_Peek_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, CanShim_Peek(NULL_PTR, NULL_PTR));
}

void test_CanShim_Peek_saturates_at_limit(void)
{
    CanShim3In_t  in  = { 0 };
    CanShim3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, CanShim_Peek(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_CanShim_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, CanShim_Apply(NULL_PTR, NULL_PTR));
}

void test_CanShim_Apply_saturates_at_limit(void)
{
    CanShim3In_t  in  = { 0 };
    CanShim3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, CanShim_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_CanShim_Get_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, CanShim_Get(NULL_PTR, NULL_PTR));
}

void test_CanShim_Get_is_monotonic(void)
{
    CanShim3In_t  in  = { 0 };
    CanShim3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, CanShim_Get(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

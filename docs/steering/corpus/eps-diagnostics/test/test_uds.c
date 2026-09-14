/*
 * test_uds.c — unit tests for SWC-DIAG
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2016 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "uds.h"


void test_Uds_Dispatch_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Uds_Dispatch(NULL_PTR, NULL_PTR));
}

void test_Uds_Dispatch_holds_at_zero(void)
{
    UdsIn_t  in  = { 0 };
    UdsOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Uds_Dispatch(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Uds_ReadDid_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Uds_ReadDid(NULL_PTR, NULL_PTR));
}

void test_Uds_ReadDid_holds_at_zero(void)
{
    UdsIn_t  in  = { 0 };
    UdsOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Uds_ReadDid(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Uds_WriteDid_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Uds_WriteDid(NULL_PTR, NULL_PTR));
}

void test_Uds_WriteDid_is_symmetric(void)
{
    UdsIn_t  in  = { 0 };
    UdsOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Uds_WriteDid(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

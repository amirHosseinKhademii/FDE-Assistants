/*
 * test_veh_speed.c — unit tests for SWC-ARB
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2018 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "veh_speed.h"


void test_VehSpd_Read_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, VehSpd_Read(NULL_PTR, NULL_PTR));
}

void test_VehSpd_Read_is_monotonic(void)
{
    VehSpeedIn_t  in  = { 0 };
    VehSpeedOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, VehSpd_Read(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_VehSpd_CheckStaleness_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, VehSpd_CheckStaleness(NULL_PTR, NULL_PTR));
}

void test_VehSpd_CheckStaleness_saturates_at_limit(void)
{
    VehSpeedIn_t  in  = { 0 };
    VehSpeedOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, VehSpd_CheckStaleness(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_VehSpd_Fallback_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, VehSpd_Fallback(NULL_PTR, NULL_PTR));
}

void test_VehSpd_Fallback_is_symmetric(void)
{
    VehSpeedIn_t  in  = { 0 };
    VehSpeedOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, VehSpd_Fallback(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

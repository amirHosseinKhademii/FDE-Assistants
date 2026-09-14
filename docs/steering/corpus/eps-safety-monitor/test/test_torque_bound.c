/*
 * test_torque_bound.c — unit tests for SWC-SAFEMON
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2017 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "torque_bound.h"


void test_Bound_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Bound_Check(NULL_PTR, NULL_PTR));
}

void test_Bound_Check_saturates_at_limit(void)
{
    TorqueBoundIn_t  in  = { 0 };
    TorqueBoundOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Bound_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Bound_Trip_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Bound_Trip(NULL_PTR, NULL_PTR));
}

void test_Bound_Trip_is_monotonic(void)
{
    TorqueBoundIn_t  in  = { 0 };
    TorqueBoundOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Bound_Trip(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

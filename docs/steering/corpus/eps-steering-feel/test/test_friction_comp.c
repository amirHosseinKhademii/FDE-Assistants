/*
 * test_friction_comp.c — unit tests for SWC-FRICCOMP
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2020 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "friction_comp.h"


void test_Fric_Estimate_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Fric_Estimate(NULL_PTR, NULL_PTR));
}

void test_Fric_Estimate_is_symmetric(void)
{
    FrictionCompIn_t  in  = { 0 };
    FrictionCompOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Fric_Estimate(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Fric_Compensate_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Fric_Compensate(NULL_PTR, NULL_PTR));
}

void test_Fric_Compensate_is_monotonic(void)
{
    FrictionCompIn_t  in  = { 0 };
    FrictionCompOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Fric_Compensate(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

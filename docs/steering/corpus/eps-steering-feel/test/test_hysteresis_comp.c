/*
 * test_hysteresis_comp.c — unit tests for SWC-HYSTCOMP
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2015 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "hysteresis_comp.h"


void test_Hyst_Shape_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Hyst_Shape(NULL_PTR, NULL_PTR));
}

void test_Hyst_Shape_is_symmetric(void)
{
    HysteresisCompIn_t  in  = { 0 };
    HysteresisCompOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Hyst_Shape(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Hyst_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Hyst_Apply(NULL_PTR, NULL_PTR));
}

void test_Hyst_Apply_is_symmetric(void)
{
    HysteresisCompIn_t  in  = { 0 };
    HysteresisCompOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Hyst_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

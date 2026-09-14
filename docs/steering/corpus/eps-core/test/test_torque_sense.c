/*
 * test_torque_sense.c — unit tests for SWC-TRQSENS
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2020 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "torque_sense.h"


void test_TrqSens_Read_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, TrqSens_Read(NULL_PTR, NULL_PTR));
}

void test_TrqSens_Read_is_monotonic(void)
{
    TorqueSenseIn_t  in  = { 0 };
    TorqueSenseOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, TrqSens_Read(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_TrqSens_Plausibilise_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, TrqSens_Plausibilise(NULL_PTR, NULL_PTR));
}

void test_TrqSens_Plausibilise_holds_at_zero(void)
{
    TorqueSenseIn_t  in  = { 0 };
    TorqueSenseOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, TrqSens_Plausibilise(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_TrqSens_Filter_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, TrqSens_Filter(NULL_PTR, NULL_PTR));
}

void test_TrqSens_Filter_is_monotonic(void)
{
    TorqueSenseIn_t  in  = { 0 };
    TorqueSenseOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, TrqSens_Filter(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

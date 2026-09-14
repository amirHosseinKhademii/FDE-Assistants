/*
 * test_feedback_actuator.c — unit tests for SWC-PLT-011
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2019 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "feedback_actuator.h"


void test_Fba_Render_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Fba_Render(NULL_PTR, NULL_PTR));
}

void test_Fba_Render_is_monotonic(void)
{
    FeedbackActuatorIn_t  in  = { 0 };
    FeedbackActuatorOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Fba_Render(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Fba_Fault_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Fba_Fault(NULL_PTR, NULL_PTR));
}

void test_Fba_Fault_is_monotonic(void)
{
    FeedbackActuatorIn_t  in  = { 0 };
    FeedbackActuatorOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Fba_Fault(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

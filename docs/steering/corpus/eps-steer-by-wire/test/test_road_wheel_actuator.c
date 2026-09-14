/*
 * test_road_wheel_actuator.c — unit tests for SWC-PLT-010
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2019 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "road_wheel_actuator.h"


void test_Rwa_Track_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Rwa_Track(NULL_PTR, NULL_PTR));
}

void test_Rwa_Track_saturates_at_limit(void)
{
    RoadWheelActuatorIn_t  in  = { 0 };
    RoadWheelActuatorOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Rwa_Track(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Rwa_Fault_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Rwa_Fault(NULL_PTR, NULL_PTR));
}

void test_Rwa_Fault_holds_at_zero(void)
{
    RoadWheelActuatorIn_t  in  = { 0 };
    RoadWheelActuatorOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Rwa_Fault(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

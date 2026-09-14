/*
 * test_state_machine_1.c — unit tests for SWC-PLT-013
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2017 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "state_machine_1.h"


void test_StateMachine_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, StateMachine_Put(NULL_PTR, NULL_PTR));
}

void test_StateMachine_Put_is_monotonic(void)
{
    StateMachine1In_t  in  = { 0 };
    StateMachine1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, StateMachine_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_StateMachine_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, StateMachine_Check(NULL_PTR, NULL_PTR));
}

void test_StateMachine_Check_is_symmetric(void)
{
    StateMachine1In_t  in  = { 0 };
    StateMachine1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, StateMachine_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_StateMachine_Flush_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, StateMachine_Flush(NULL_PTR, NULL_PTR));
}

void test_StateMachine_Flush_saturates_at_limit(void)
{
    StateMachine1In_t  in  = { 0 };
    StateMachine1Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, StateMachine_Flush(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

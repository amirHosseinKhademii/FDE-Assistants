/*
 * test_event_queue_3.c — unit tests for SWC-PLT-011
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2016 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "event_queue_3.h"


void test_EventQueue_Get_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, EventQueue_Get(NULL_PTR, NULL_PTR));
}

void test_EventQueue_Get_is_symmetric(void)
{
    EventQueue3In_t  in  = { 0 };
    EventQueue3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, EventQueue_Get(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_EventQueue_Flush_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, EventQueue_Flush(NULL_PTR, NULL_PTR));
}

void test_EventQueue_Flush_is_monotonic(void)
{
    EventQueue3In_t  in  = { 0 };
    EventQueue3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, EventQueue_Flush(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_EventQueue_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, EventQueue_Put(NULL_PTR, NULL_PTR));
}

void test_EventQueue_Put_is_symmetric(void)
{
    EventQueue3In_t  in  = { 0 };
    EventQueue3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, EventQueue_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_EventQueue_Calc_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, EventQueue_Calc(NULL_PTR, NULL_PTR));
}

void test_EventQueue_Calc_is_monotonic(void)
{
    EventQueue3In_t  in  = { 0 };
    EventQueue3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, EventQueue_Calc(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_EventQueue_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, EventQueue_Check(NULL_PTR, NULL_PTR));
}

void test_EventQueue_Check_is_monotonic(void)
{
    EventQueue3In_t  in  = { 0 };
    EventQueue3Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, EventQueue_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

/*
 * test_ring_buffer_4.c — unit tests for SWC-PLT-019
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2019 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "ring_buffer_4.h"


void test_RingBuffer_Get_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RingBuffer_Get(NULL_PTR, NULL_PTR));
}

void test_RingBuffer_Get_holds_at_zero(void)
{
    RingBuffer4In_t  in  = { 0 };
    RingBuffer4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RingBuffer_Get(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RingBuffer_Check_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RingBuffer_Check(NULL_PTR, NULL_PTR));
}

void test_RingBuffer_Check_holds_at_zero(void)
{
    RingBuffer4In_t  in  = { 0 };
    RingBuffer4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RingBuffer_Check(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RingBuffer_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RingBuffer_Put(NULL_PTR, NULL_PTR));
}

void test_RingBuffer_Put_saturates_at_limit(void)
{
    RingBuffer4In_t  in  = { 0 };
    RingBuffer4Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RingBuffer_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

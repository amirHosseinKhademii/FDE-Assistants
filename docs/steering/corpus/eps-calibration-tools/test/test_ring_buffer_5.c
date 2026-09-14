/*
 * test_ring_buffer_5.c — unit tests for SWC-PLT-021
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2020 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "ring_buffer_5.h"


void test_RingBuffer_Put_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RingBuffer_Put(NULL_PTR, NULL_PTR));
}

void test_RingBuffer_Put_saturates_at_limit(void)
{
    RingBuffer5In_t  in  = { 0 };
    RingBuffer5Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RingBuffer_Put(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RingBuffer_Flush_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RingBuffer_Flush(NULL_PTR, NULL_PTR));
}

void test_RingBuffer_Flush_holds_at_zero(void)
{
    RingBuffer5In_t  in  = { 0 };
    RingBuffer5Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RingBuffer_Flush(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_RingBuffer_Apply_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, RingBuffer_Apply(NULL_PTR, NULL_PTR));
}

void test_RingBuffer_Apply_saturates_at_limit(void)
{
    RingBuffer5In_t  in  = { 0 };
    RingBuffer5Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, RingBuffer_Apply(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

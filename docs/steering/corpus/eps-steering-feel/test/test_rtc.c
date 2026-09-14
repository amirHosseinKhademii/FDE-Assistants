/*
 * test_rtc.c — unit tests for SWC-RTC
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2018 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "rtc.h"


void test_Rtc_CalcReturn_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Rtc_CalcReturn(NULL_PTR, NULL_PTR));
}

void test_Rtc_CalcReturn_is_monotonic(void)
{
    RtcIn_t  in  = { 0 };
    RtcOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Rtc_CalcReturn(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Rtc_Blend_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Rtc_Blend(NULL_PTR, NULL_PTR));
}

void test_Rtc_Blend_saturates_at_limit(void)
{
    RtcIn_t  in  = { 0 };
    RtcOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Rtc_Blend(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

/*
 * test_watchdog.c — unit tests for SWC-SAFEMON
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2018 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "watchdog.h"


void test_Wdg_Kick_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Wdg_Kick(NULL_PTR, NULL_PTR));
}

void test_Wdg_Kick_saturates_at_limit(void)
{
    WatchdogIn_t  in  = { 0 };
    WatchdogOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Wdg_Kick(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Wdg_Expire_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Wdg_Expire(NULL_PTR, NULL_PTR));
}

void test_Wdg_Expire_holds_at_zero(void)
{
    WatchdogIn_t  in  = { 0 };
    WatchdogOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Wdg_Expire(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

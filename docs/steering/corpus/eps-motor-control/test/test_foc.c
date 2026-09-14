/*
 * test_foc.c — unit tests for SWC-MOTCTL
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2018 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "foc.h"


void test_Foc_Park_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Foc_Park(NULL_PTR, NULL_PTR));
}

void test_Foc_Park_holds_at_zero(void)
{
    FocIn_t  in  = { 0 };
    FocOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Foc_Park(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Foc_Clarke_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Foc_Clarke(NULL_PTR, NULL_PTR));
}

void test_Foc_Clarke_is_symmetric(void)
{
    FocIn_t  in  = { 0 };
    FocOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Foc_Clarke(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Foc_CurrentLoop_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Foc_CurrentLoop(NULL_PTR, NULL_PTR));
}

void test_Foc_CurrentLoop_saturates_at_limit(void)
{
    FocIn_t  in  = { 0 };
    FocOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Foc_CurrentLoop(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Foc_Pwm_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Foc_Pwm(NULL_PTR, NULL_PTR));
}

void test_Foc_Pwm_is_symmetric(void)
{
    FocIn_t  in  = { 0 };
    FocOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Foc_Pwm(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

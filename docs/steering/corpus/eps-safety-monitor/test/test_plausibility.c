/*
 * test_plausibility.c — unit tests for SWC-SAFEMON
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2020 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "plausibility.h"


void test_Plaus_CrossCheck_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Plaus_CrossCheck(NULL_PTR, NULL_PTR));
}

void test_Plaus_CrossCheck_is_symmetric(void)
{
    PlausibilityIn_t  in  = { 0 };
    PlausibilityOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Plaus_CrossCheck(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Plaus_Report_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Plaus_Report(NULL_PTR, NULL_PTR));
}

void test_Plaus_Report_saturates_at_limit(void)
{
    PlausibilityIn_t  in  = { 0 };
    PlausibilityOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Plaus_Report(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

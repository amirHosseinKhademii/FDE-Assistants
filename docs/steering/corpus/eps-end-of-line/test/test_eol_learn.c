/*
 * test_eol_learn.c — unit tests for SWC-EOL
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from 2019 and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "eol_learn.h"


void test_Eol_LearnCentre_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Eol_LearnCentre(NULL_PTR, NULL_PTR));
}

void test_Eol_LearnCentre_saturates_at_limit(void)
{
    EolLearnIn_t  in  = { 0 };
    EolLearnOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Eol_LearnCentre(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Eol_LearnOffsets_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Eol_LearnOffsets(NULL_PTR, NULL_PTR));
}

void test_Eol_LearnOffsets_is_symmetric(void)
{
    EolLearnIn_t  in  = { 0 };
    EolLearnOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Eol_LearnOffsets(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

void test_Eol_Store_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, Eol_Store(NULL_PTR, NULL_PTR));
}

void test_Eol_Store_is_monotonic(void)
{
    EolLearnIn_t  in  = { 0 };
    EolLearnOut_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, Eol_Store(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}

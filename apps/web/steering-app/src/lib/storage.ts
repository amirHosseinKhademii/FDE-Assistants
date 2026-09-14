/**
 * This app's corner of local storage.
 *
 * The implementation is `@fde/uikit`'s — pharma had the same ten lines and
 * differed only in the prefix, which is what made the parameter obvious. The
 * module stays so that every call site reads `load('apiKey', …)` rather than
 * threading a namespace through the app.
 *
 * WHAT GOES IN IT AND WHAT DOES NOT. The API key, so a reader does not retype
 * it on every visit — and nothing about a requirement or an answer. Those are
 * the customer's, they are filed server-side where they can be governed, and a
 * copy in a browser nobody can reach is a copy nobody can delete either.
 */
import { createStore } from '@fde/uikit';

const store = createStore('steering');

export const load = store.load;
export const save = store.save;

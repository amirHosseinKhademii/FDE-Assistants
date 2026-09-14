/**
 * This product's corner of local storage.
 *
 * The implementation is `@fde/uikit`'s — both apps had the same ten lines and
 * differed only in this prefix, which is what made the parameter obvious. The
 * module stays so that every call site reads `load('lot', …)` rather than
 * threading a namespace through the app.
 */
import { createStore } from '@fde/uikit';

const store = createStore('pharma');

export const load = store.load;
export const save = store.save;

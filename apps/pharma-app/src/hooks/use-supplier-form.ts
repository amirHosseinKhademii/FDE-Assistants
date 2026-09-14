/**
 * What the supplier form remembers.
 *
 * THE SAME EDIT RULE AS THE RELEASE DESK: once the sentence has been typed in,
 * the picker stops rewriting it. Silently overwriting what somebody typed is
 * worse than leaving a stale sentence on screen.
 *
 * A SIBLING HOOK RATHER THAN A SHARED ONE, and the sentence is why. Release
 * composes from two pickers, a batch and a destination market, and the
 * mismatch between them is the interesting case the form goes out of its way to
 * point at. This composes from one. Merging them would mean a hook that takes a
 * sentence-builder and a variable number of fields — which is the shape of
 * something with no opinion at all, in the one place the app most needs one.
 *
 * IT IS DOMAIN and stays in this app, same test as `use-desk-form`.
 */
import { useState } from 'react';
import { load, save } from '../lib/storage';

/**
 * The question a supplier disqualification actually raises. It asks what was
 * MADE and where it WENT — never what should be done about it, because the
 * thing that should be done is a regulatory decision this system does not make.
 */
export const questionFor = (supplier: string): string =>
  supplier
    ? `${supplier} was disqualified — what did we make with their material, and where did it go?`
    : 'Which supplier was disqualified, and what did we make with their material?';

export function useSupplierForm() {
  const [supplier, setSupplier] = useState(() => load('supplier', 'SUP-04'));
  // DEFAULTS TO THE CHEAP ROUTE, and is deliberately not remembered as the
  // last-used value the way the other controls are. Picking the fan-out is a
  // decision to spend five times as much; inheriting it silently from a session
  // last week is not the same decision.
  const [topology, setTopology] = useState('loop');
  const [loop, setLoop] = useState(() => load('loop', 'sdk'));
  const [apiKey, setApiKey] = useState(() => load('apiKey', ''));
  const [question, setQuestion] = useState(() =>
    load('supplierQuestion', questionFor(load('supplier', 'SUP-04'))),
  );
  const [edited, setEdited] = useState(false);

  function pick(next: string) {
    setSupplier(next);
    if (!edited) setQuestion(questionFor(next));
  }

  function editQuestion(v: string) {
    setEdited(true);
    setQuestion(v);
  }

  function remember() {
    save('supplierQuestion', question);
    save('supplier', supplier);
    save('loop', loop);
    save('apiKey', apiKey);
  }

  return {
    supplier, loop, apiKey, question, topology,
    setLoop, setApiKey, setTopology,
    pick, editQuestion, remember,
  };
}

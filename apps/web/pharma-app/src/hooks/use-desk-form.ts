/**
 * Everything the form remembers, and the one rule about when it stops
 * rewriting itself.
 *
 * THE RULE WORTH LIFTING OUT OF THE PAGE: once the sentence has been edited by
 * hand, the pickers stop composing it. Silently overwriting what somebody typed
 * is worse than leaving a stale sentence on screen, and that is a decision
 * about behaviour rather than about layout — which is why it belongs in a hook
 * and not in a component.
 *
 * IT IS DOMAIN, and stays in this app. `questionFor` writes an English sentence
 * about a batch and a market; the insurance sibling would write about a claim.
 * Nothing here transfers, which is exactly the test `@fde/uikit` applies.
 */
import { useState } from 'react';
import { load, save } from '../lib/storage';

/** The sentence the pickers compose. */
export const questionFor = (lot: string, market: string): string =>
  lot ? `Can ${lot} be released to ${market}?` : `Can this batch be released to ${market}?`;

export function useDeskForm() {
  const [lot, setLot] = useState(() => load('lot', 'LOT-IBU200-2609-B'));
  const [market, setMarket] = useState(() => load('market', 'EU'));
  const [loop, setLoop] = useState(() => load('loop', 'sdk'));
  const [apiKey, setApiKey] = useState(() => load('apiKey', ''));
  const [question, setQuestion] = useState(() =>
    load('question', questionFor(load('lot', 'LOT-IBU200-2609-B'), load('market', 'EU'))),
  );
  const [edited, setEdited] = useState(false);

  /** A picker moved: recompose the sentence unless it has been typed in. */
  function pick(nextLot: string, nextMarket: string) {
    setLot(nextLot);
    setMarket(nextMarket);
    if (!edited) setQuestion(questionFor(nextLot, nextMarket));
  }

  function editQuestion(v: string) {
    setEdited(true);
    setQuestion(v);
  }

  /** Called on submit, so a reload puts the reviewer back where they were. */
  function remember() {
    save('question', question);
    save('lot', lot);
    save('market', market);
    save('loop', loop);
    save('apiKey', apiKey);
  }

  return {
    lot, market, loop, apiKey, question,
    setLoop, setApiKey,
    pick, editQuestion, remember,
  };
}

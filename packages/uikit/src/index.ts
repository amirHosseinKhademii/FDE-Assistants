/**
 * @fde/uikit — the shared surface layer.
 *
 * WHAT BELONGS HERE: controls, severity, motion, and the tokens they read.
 * Everything in this package is theme-driven — components reference only
 * `--ui-*` names, so re-pointing those in a consumer's stylesheet restyles the
 * whole set without touching a component.
 *
 * WHAT DOES NOT BELONG HERE: anything that knows what the product is about. No
 * identifier grammar (`Prose` takes its patterns as a prop), no copy that names
 * a domain concept, no severity RULES — only severity's appearance. The empty
 * state, the answer layout and the sentences explaining what a tool did are the
 * consumer's, because they are the part that does not transfer.
 *
 * ONE NON-COMPONENT LIVES HERE: `createStore`. Where a control's last value is
 * kept between visits is a property of the surface, so it passes the same test
 * everything else here does. It was extracted on a measured second occurrence —
 * both apps held a byte-identical copy differing only in the key prefix.
 *
 * NOT HERE EITHER, deliberately: the SSE client and the request hook. They are
 * transport and state, not presentation, and a package with two jobs is how you
 * end up with two unrelated things sharing one name. See `docs/pharma/
 * EXTRACTION.md` — the app transport is tracked as its own candidate.
 *
 * WHAT THE CONSUMER DOES WITH ALL THIS is written down rather than left to be
 * inferred: `docs/pharma/DESIGN.md` documents the dark surface built on these
 * tokens — its palette, type, motion catalogue and the rules about which colour
 * is allowed to mean something. It is also the clearest statement of why half
 * of what it describes may not move into this package.
 *
 * ONE CONSUMER TODAY. This was extracted with a single caller, which is normally
 * the thing to avoid: an API shaped by one caller encodes that caller's
 * assumptions. The mitigation is the token indirection above — the second
 * surface in this repo is light and serif, so any component that hard-coded a
 * dark palette would be caught immediately when it adopts.
 */
export * from './icons';
export * from './tokens/tone';

export { Mono } from './components/Mono';
export { Tile } from './components/Tile';
export { OriginDialog, originOf, EXIT_MS } from './components/OriginDialog';
export type { Origin } from './components/OriginDialog';
export { FlowMap } from './components/FlowMap';
export type { FlowNode, FlowEdge, FlowStage, FlowWeb } from './components/FlowMap';
export { DetailCard } from './components/DetailCard';
export { Figures } from './components/Figures';
export { FieldList } from './components/FieldList';
export type { FieldKind, FieldRow } from './components/FieldList';
export { useCountUp } from './lib/use-count-up';
export { Quote } from './components/Quote';
export { Chip } from './components/Chip';
export { Panel } from './components/Panel';
export { Field } from './components/Field';
export { Select } from './components/Select';
export { SubmitButton } from './components/SubmitButton';
export { WorkingNotes, type TraceLine } from './components/WorkingNotes';
export { RunFigures, type Run } from './components/RunFigures';
export { Failure } from './components/Failure';
export { Prose, Line, type TokenKind, type TokenPattern } from './components/Prose';

export { createStore, type Store } from './lib/storage';

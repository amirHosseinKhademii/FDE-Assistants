/**
 * @veresk/surface — the parts of Veresk's own site that every engagement shares.
 *
 * WHY THIS IS NOT `@fde/uikit`, AND THE LINE IS SHARP. `@fde/uikit` is the
 * layer that would be lifted into a customer's own repository: controls,
 * severity, motion, tokens, and nothing that knows what is being built. This
 * package is the opposite — it knows there is a firm called Veresk with several
 * engagements, that an engagement page opens on a hero and shows the customer's
 * estate, and that an estate is a row of databases you can open. None of that
 * transfers anywhere; all of it is shared by more than one page of THIS site.
 *
 * WHY IT IS NOT COPY-PASTE BETWEEN THE APPS EITHER. `apps/veresk-app` and
 * `apps/steering-app` are separate deployments on separate ports. Two copies of
 * `EstateExplorer` differing only in which customer is named is exactly the
 * thing that drifts: one gets a fix and the other does not.
 *
 * IT IS ALLOWED TAILWIND UTILITIES AND `@fde/uikit` IS NOT — which is the one
 * asymmetry worth knowing about. Tailwind v4 does not scan `node_modules`, so a
 * consumer of this package must name it as a source:
 *
 *     @source '../../../node_modules/@veresk/surface/src';
 *
 * Both apps do. That line is a real cost and it is why `@fde/uikit` was kept
 * free of utilities — a package meant to be dropped into somebody else's build
 * must render correctly with no build configuration at all, because a missing
 * `@source` produces an unstyled page from a SUCCESSFUL build. Here there are
 * exactly two consumers, both in this repo, both checked by screenshot.
 */
export { Aurora, type AuroraTone } from './components/Aurora';
export { RouteProgress } from './components/RouteProgress';
export { CylinderGlyph, PagesGlyph } from './components/glyphs';
export { EstateExplorer } from './components/EstateExplorer';
export type {
  EstateColumn,
  EstateExplorerProps,
  EstateFace,
  EstateLike,
  EstateTable,
} from './components/EstateExplorer';

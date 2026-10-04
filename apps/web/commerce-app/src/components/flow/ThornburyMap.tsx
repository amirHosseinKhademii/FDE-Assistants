/**
 * How one case is answered: the whole Thornbury system in one diagram.
 *
 * A request travels left to right, from Iris's desk through the assistant loop
 * to the MCP server, down to the backend API, and out to five systems and a
 * policy index. The dashed lines show what is NOT connected: the model never
 * touches a database, the tools never touch the CRM directly, and issue_refund
 * is never registered - it is there so the guard has something real to refuse.
 *
 * THIS MAP MIRRORS NerveMap FROM PHARMA. Read the comments there for the design
 * principles: colour means provenance only; the reveal is a button, not a hover;
 * order is encoded twice (animation and stages).
 */
import { FlowMap } from '@fde/uikit';
import { CylinderGlyph, PagesGlyph } from '@veresk/surface';
import type { FlowEdge, FlowNode, FlowStage, FlowWeb } from '@fde/uikit';
import { DeskGlyph, WrenchGlyph, GearSpannerGlyph } from './nerve-glyphs';

/* The map, as data
   Coordinates are in the 1600x800 viewBox; the cards read the same numbers as
   percentages. WIDTH and HEIGHT chosen so no overlap; nodes in a column get
   enough vertical spacing for their r (radius).
*/

/**
 * THE KINDS THIS MAP HAS. FlowMap takes kind as a free-form string and
 * styles nothing by it - what kinds exist is this products vocabulary.
 */
type Kind =
  | 'you'
  | 'web'
  | 'loop'
  | 'gate'
  | 'door'
  | 'session'
  | 'tool'
  | 'write-tool'
  | 'guard'
  | 'client'
  | 'api'
  | 'system'
  | 'corpus';

/** The clearance a fibre attaches at — the web's radius, not the card's. */
const LOOP_R = 140;

/** The web's extent, and how many points make it look like a body. */
const WEB: FlowWeb = { nodeId: 'loop', rx: 160, ry: 140, points: 74 };

const NODES: FlowNode[] = [
  /* Stage 1: The question */
  {
    id: 'you',
    kind: 'you',
    name: 'Iris',
    sub: 'a case to resolve',
    back: 'The customer words, typed into the contact form. The case ID comes from the session, fixed before any tool can run.',
    x: 80,
    y: 400,
    r: 65,
  },
  {
    id: 'web-start',
    kind: 'web',
    name: 'Goods desk',
    sub: '/desk, port :3600',
    back: 'The web page Iris uses. It streams every tool call as it happens. The session token and MCP bearer token stay on the server.',
    x: 200,
    y: 400,
    r: 60,
    cardDy: -140,
  },

  /* Stage 2: The loop */
  {
    id: 'loop',
    kind: 'loop',
    name: 'the model',
    sub: 'gemini-3.5-flash-lite',
    back: 'Reads the case and the policy. Picks a tool. Reads what comes back. Writes an answer. It never queries a database itself, only what the tools return.',
    x: 400,
    y: 400,
    r: LOOP_R,
    cardDy: 160,
  },
  {
    id: 'gate',
    kind: 'gate',
    name: 'allowlist gate',
    sub: 'which tools to show',
    back: 'The model only sees tools on a list. issue_refund is defined but never listed - the gate refuses it.',
    x: 400,
    y: 620,
    r: 65,
  },

  /* Stage 3: Inside the MCP server (:3620) */
  {
    id: 'door',
    kind: 'door',
    name: 'front door',
    sub: 'HTTP on :3620',
    back: 'Accepts HTTP requests with a bearer token (COMMERCE_MCP_TOKEN). Refuses anything else - fail-closed. Speaks MCP protocol 2026-07-28.',
    x: 610,
    y: 220,
    r: 70,
  },
  {
    id: 'session',
    kind: 'session',
    name: 'the session',
    sub: 'case fixed before tools run',
    back: 'The case ID arrives in the x-case-id header on every request and is locked in. Tools take no case or order argument, so typed text cannot point the model at another order.',
    x: 610,
    y: 360,
    r: 70,
  },
  {
    id: 'get_order',
    kind: 'tool',
    name: 'get_order',
    sub: 'what was bought',
    back: 'Reads the order, what was paid, and what has already been refunded. Takes no arguments - the order is the sessions.',
    x: 610,
    y: 500,
    r: 70,
  },
  {
    id: 'get_delivery',
    kind: 'tool',
    name: 'get_delivery',
    sub: 'shipment and proof',
    back: 'Reads shipment details, every scan, the proof-of-delivery photo, and what the driver wrote about the route.',
    x: 770,
    y: 260,
    r: 70,
  },
  {
    id: 'get_contact_history',
    kind: 'tool',
    name: 'get_contact_history',
    sub: 'past cases',
    back: 'Reads the conversation history and every resolution ever given to this customer.',
    x: 770,
    y: 380,
    r: 70,
  },
  {
    id: 'get_policy_rules',
    kind: 'tool',
    name: 'get_policy_rules',
    sub: 'configured rules',
    back: 'Reads the windows, rules, goodwill limits, and approval thresholds that actually run the returns tool.',
    x: 770,
    y: 500,
    r: 70,
  },
  {
    id: 'search_policy',
    kind: 'tool',
    name: 'search_policy',
    sub: 'written policy',
    back: 'Searches twelve policy documents by meaning: published returns policy, damaged-on-arrival procedures, carrier contracts, and goodwill guidance.',
    x: 770,
    y: 620,
    r: 70,
  },
  {
    id: 'propose_resolution',
    kind: 'tool',
    name: 'propose_resolution',
    sub: 'draft for approval',
    back: 'Writes a DRAFT resolution with status proposed. The model proposes; a person approves and signs off.',
    x: 930,
    y: 380,
    r: 70,
  },
  {
    id: 'issue_refund',
    kind: 'write-tool',
    name: 'issue_refund',
    sub: 'never registered',
    back: 'Defined but never added to the allowlist. The gate refuses it. Moving money is never the models job.',
    x: 930,
    y: 560,
    r: 70,
    tone: 'var(--color-ui-faint)',
  },
  {
    id: 'safety_net',
    kind: 'guard',
    name: 'safety net',
    sub: 'outcome labelling',
    back: 'Every tool is wrapped by register(). It catches crashes, labels every result with a cause (ok, not_found, out_of_scope, invalid_request, unauthorized, upstream_unavailable, malformed_response, invalid_output, threw), and passes both through.',
    x: 930,
    y: 180,
    r: 70,
  },
  {
    id: 'api_client',
    kind: 'client',
    name: 'API client',
    sub: 'service token only',
    back: 'Calls the Thornbury API with a service token (x-service-token header). 15s timeout. Parses every reply against a schema (Zod), so a wrong shape is an error, not silent success. Holds no database password.',
    x: 1130,
    y: 400,
    r: 70,
  },

  /* Stage 4: API :3610 */
  {
    id: 'api',
    kind: 'api',
    name: 'Thornbury API',
    sub: 'NestJS, service token',
    back: 'No AI in it. Endpoints: GET /orders/:id, /deliveries/by-order/:orderId, /customers/:id/history, /policy/rules, POST /resolutions.',
    x: 1310,
    y: 400,
    r: 75,
  },

  /* Stage 5: The estate (five systems + policy index) */
  {
    id: 'thb_shop',
    kind: 'system',
    name: 'thb_shop',
    sub: 'Orders & refunds',
    back: 'Storefront, orders, payments, and what has already been refunded against each order.',
    x: 1490,
    y: 80,
    r: 70,
  },
  {
    id: 'thb_wms',
    kind: 'system',
    name: 'thb_wms',
    sub: 'Warehouse',
    back: 'How it was picked, how it was packed, and the photograph taken while packing.',
    x: 1490,
    y: 200,
    r: 70,
  },
  {
    id: 'thb_fleet',
    kind: 'system',
    name: 'thb_fleet',
    sub: 'Transport',
    back: 'The van, the route, every scan, proof-of-delivery photo, and what the driver wrote about that route that day.',
    x: 1490,
    y: 320,
    r: 70,
  },
  {
    id: 'thb_crm',
    kind: 'system',
    name: 'thb_crm',
    sub: 'Contact centre',
    back: 'The conversation, the case, and every resolution ever given to this customer.',
    x: 1490,
    y: 440,
    r: 70,
  },
  {
    id: 'thb_policy',
    kind: 'system',
    name: 'thb_policy',
    sub: 'Policy settings',
    back: 'Return windows, refund rules, goodwill limits, and approval thresholds - the configured rules that actually run the system.',
    x: 1490,
    y: 560,
    r: 70,
  },
  {
    id: 'thb_kb',
    kind: 'corpus',
    name: 'thb_kb',
    sub: 'Policy index',
    back: 'The written policies themselves (83 chunks), searched by meaning. A library, not a system of record. Read-only role thb_kb_reader.',
    x: 1490,
    y: 680,
    r: 70,
  },
];

const EDGES: FlowEdge[] = [
  /* The question reaching the loop */
  { from: 'you', to: 'web-start', at: 0 },
  { from: 'web-start', to: 'loop', at: 0.5, note: 'your question', noteAt: [300, 360] },

  /* The loop reaching out to tools */
  { from: 'loop', to: 'gate', at: 1.0 },
  { from: 'gate', to: 'door', at: 1.2, note: 'MCP call + bearer token', noteAt: [560, 305] },
  { from: 'door', to: 'session', at: 1.4, note: 'x-case-id', noteAt: [610, 290] },
  { from: 'session', to: 'get_order', at: 1.6, note: 'case fixed', noteAt: [660, 430] },
  { from: 'session', to: 'get_delivery', at: 1.7 },
  { from: 'session', to: 'get_contact_history', at: 1.8 },
  { from: 'session', to: 'get_policy_rules', at: 1.9 },
  { from: 'session', to: 'search_policy', at: 2.0 },

  /* Tools to safety net */
  { from: 'get_order', to: 'safety_net', at: 2.2 },
  { from: 'get_delivery', to: 'safety_net', at: 2.35 },
  { from: 'get_contact_history', to: 'safety_net', at: 2.5 },
  { from: 'get_policy_rules', to: 'safety_net', at: 2.65 },
  { from: 'search_policy', to: 'safety_net', at: 2.8 },
  { from: 'propose_resolution', to: 'safety_net', at: 2.95 },

  /* Safety net to API client */
  { from: 'safety_net', to: 'api_client', at: 3.2 },
  { from: 'get_order', to: 'api_client', at: 3.2 },
  { from: 'get_delivery', to: 'api_client', at: 3.35 },
  { from: 'get_contact_history', to: 'api_client', at: 3.5 },
  { from: 'get_policy_rules', to: 'api_client', at: 3.65 },
  { from: 'propose_resolution', to: 'api_client', at: 3.8 },

  /* API client calling API */
  { from: 'api_client', to: 'api', at: 4.0, note: 'HTTPS + service token', noteAt: [1220, 370] },

  /* API calling databases */
  { from: 'api', to: 'thb_shop', at: 4.3, note: 'SQL', noteAt: [1400, 140] },
  { from: 'api', to: 'thb_wms', at: 4.45 },
  { from: 'api', to: 'thb_fleet', at: 4.6 },
  { from: 'api', to: 'thb_crm', at: 4.75 },
  { from: 'api', to: 'thb_policy', at: 4.9 },

  /* search_policy reaching the knowledge base directly */
  { from: 'search_policy', to: 'thb_kb', at: 5.0, note: 'read-only login', noteAt: [1130, 650] },
];

/**
 * THE GAPS THAT NEVER CLOSE: what is NOT connected.
 * These are the critical architectural points.
 */
const NON_EDGES: Array<[string, string]> = [
  ['gate', 'issue_refund'],
  ['door', 'thb_shop'],
  ['door', 'thb_wms'],
  ['door', 'thb_fleet'],
  ['door', 'thb_crm'],
  ['door', 'thb_policy'],
  ['loop', 'thb_shop'],
  ['loop', 'thb_crm'],
];

const STAGES: FlowStage[] = [
  { title: 'The question', ids: ['you', 'web-start'] },
  { title: 'The loop', ids: ['loop', 'gate'] },
  { title: 'Inside the MCP server (:3620)', ids: ['door', 'session', 'get_order', 'get_delivery', 'get_contact_history', 'get_policy_rules', 'search_policy', 'propose_resolution', 'issue_refund', 'safety_net'] },
  { title: 'API client', ids: ['api_client'] },
  { title: 'Service API (:3610)', ids: ['api'] },
  { title: 'The estate', ids: ['thb_shop', 'thb_wms', 'thb_fleet', 'thb_crm', 'thb_policy', 'thb_kb'] },
];

/**
 * Which drawing belongs to which node.
 * The loop has no figure ON THE MAP - simple model.
 * In the narrow surface column, we need a reduced icon for the loop.
 */
function figureFor(node: FlowNode, inList: boolean) {
  switch (node.kind) {
    case 'you':
      return <DeskGlyph />;
    case 'web':
      return null;
    case 'loop':
      return null;
    case 'gate':
    case 'door':
    case 'session':
    case 'guard':
    case 'client':
      return <GearSpannerGlyph />;
    case 'tool':
    case 'write-tool':
      return node.id === 'search_policy' ? <WrenchGlyph /> : <GearSpannerGlyph />;
    case 'api':
      return null;
    case 'system':
      return <CylinderGlyph />;
    case 'corpus':
      return <PagesGlyph />;
    default:
      return null;
  }
}

export function ThornburyMap() {
  return (
    <section className="py-16">
      <h2 className="max-w-[34ch] font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
        How one case is answered
      </h2>
      <p className="mt-4 max-w-[58ch] leading-relaxed text-ui-dim">
        The model never touches Thornbury databases. A separate program holds the access tokens, and it is
        the only thing the assistant can reach.{' '}
        <span className="hidden sm:inline">
          Open any node to see what it does and what it holds.
        </span>
      </p>

      <div className="mt-10">
        <FlowMap
          nodes={NODES}
          edges={EDGES}
          stages={STAGES}
          web={WEB}
          nonEdges={NON_EDGES}
          width={1600}
          height={800}
          maxWidth="100%"
          cycle={12}
          figure={figureFor}
          stackNote="The MCP server holds no password to any Thornbury database - only a service token. The model never touches a database, the tools never reach the CRM directly, and issue_refund is never registered."
        />
      </div>

      <p className="mt-8 hidden max-w-[58ch] text-sm leading-relaxed text-ui-faint sm:block">
        The dashed lines show what is NOT connected. This boundary - between the model reach and the customer systems of record - is the whole point.
      </p>
    </section>
  );
}

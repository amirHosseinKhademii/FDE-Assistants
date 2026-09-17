/** `pnpm safety:round-trip` — the two hosted round-trip repairs, no model call. */
import { runRoundTripCheck } from '@fde/agent';
runRoundTripCheck().then((ok) => process.exit(ok ? 0 : 1));

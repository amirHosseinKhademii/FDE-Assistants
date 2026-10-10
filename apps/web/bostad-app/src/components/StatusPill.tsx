import { useLang } from "../lib/lang";
import type { MessageKey } from "../lib/i18n";

export type CardStatus = "checked" | "failed" | "soon";

const TONE: Record<CardStatus, "ok" | "warn" | "soon"> = { checked: "ok", failed: "warn", soon: "soon" };
const LABEL: Record<CardStatus, MessageKey> = {
  checked: "status.checked",
  failed: "status.failed",
  soon: "status.soon",
};

/** Colour and a word together, never colour alone. */
export function StatusPill({ status }: { status: CardStatus }) {
  const { t } = useLang();
  return (
    <span className="pill" data-tone={TONE[status]}>
      {t(LABEL[status])}
    </span>
  );
}

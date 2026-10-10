import { useLang } from "../lib/lang";
import type { ProfileErrorKind } from "../lib/useProfile";
import type { MessageKey } from "../lib/i18n";

const ERROR: Record<ProfileErrorKind, MessageKey> = {
  tooMany: "error.tooMany",
  badAddress: "error.badAddress",
  network: "error.network",
  generic: "error.generic",
};

/** Loading: three skeleton cards (the map placeholder is shown by the page). */
export function ProfileSkeleton() {
  const { t } = useLang();
  return (
    <div role="status" aria-label={t("loading")} className="grid-gap">
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
    </div>
  );
}

export function ProfileError({ kind, onRetry }: { kind: ProfileErrorKind; onRetry: () => void }) {
  const { t } = useLang();
  return (
    <div className="alert" role="alert">
      <div className="grid-gap">
        <strong>{t("error.title")}</strong>
        <p>{t(ERROR[kind])}</p>
        <button type="button" className="btn-secondary" onClick={onRetry} style={{ justifySelf: "start" }}>
          {t("error.retry")}
        </button>
      </div>
    </div>
  );
}

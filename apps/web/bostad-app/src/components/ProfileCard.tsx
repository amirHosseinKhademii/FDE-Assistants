import type { ReactNode } from "react";
import { useLang } from "../lib/lang";
import type { MessageKey } from "../lib/i18n";
import { Icon, type IconName } from "./Icons";
import { StatusPill, type CardStatus } from "./StatusPill";

/**
 * One card on the profile. A native <details> so it collapses without script,
 * opens by default unless it is "coming soon", and keeps its summary focusable.
 */
export function ProfileCard({
  icon,
  title,
  explain,
  status,
  children,
  reason,
  source,
  checkedAt,
  onRetry,
}: {
  icon: IconName;
  title: MessageKey;
  explain: MessageKey;
  status: CardStatus;
  children?: ReactNode;
  reason?: MessageKey;
  source?: { name: string; href: string | null };
  checkedAt?: string;
  onRetry?: () => void;
}) {
  const { t } = useLang();
  const soon = status === "soon";
  return (
    <details className={`card${soon ? " is-soon" : ""}`} open={!soon}>
      <summary>
        <span className="card-icon">
          <Icon name={icon} />
        </span>
        <span className="card-title">{t(title)}</span>
        <StatusPill status={status} />
        <Icon name="chevron" className="icon card-chevron" />
      </summary>
      <div className="card-body">
        <p className="card-explain">{t(explain)}</p>

        {status === "checked" && children}

        {status === "failed" && (
          <div className="reason">
            {reason && <p>{t(reason)}</p>}
            {onRetry && (
              <button type="button" className="btn-secondary" onClick={onRetry}>
                {t("card.tryAgain")}
              </button>
            )}
          </div>
        )}

        {status === "checked" && source && checkedAt && (
          <div className="card-foot">
            {source.href ? (
              <a href={source.href} target="_blank" rel="noreferrer">
                {t("card.source", { name: source.name, time: checkedAt })}
              </a>
            ) : (
              <span>{t("card.source", { name: source.name, time: checkedAt })}</span>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

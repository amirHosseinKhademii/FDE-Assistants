import type { ReactNode } from "react";
import { useLang } from "../lib/lang";
import type { MessageKey } from "../lib/i18n";
import { Icon, type IconName } from "./Icons";

export type CardStatus = "checked" | "failed";
export type Tone = "ok" | "warn" | "risk";
export type CardResult = { text: string; tone?: Tone };

/**
 * One card on the profile. Collapsed by default: the summary line is the icon,
 * the title and one result word. Opening it shows one sentence, a few facts and
 * the source. A native <details>, so it works without script and from the keyboard.
 */
export function ProfileCard({
  id,
  icon,
  title,
  explain,
  result,
  status = "checked",
  children,
  reason,
  source,
  checkedAt,
  onRetry,
  onToggle,
}: {
  id?: string;
  icon: IconName;
  title: MessageKey;
  explain: MessageKey;
  result?: CardResult;
  status?: CardStatus;
  children?: ReactNode;
  reason?: MessageKey;
  source?: { name: string; href: string | null };
  checkedAt?: string;
  onRetry?: () => void;
  /** Called with the new open state whenever the card is opened or closed. */
  onToggle?: (open: boolean) => void;
}) {
  const { t } = useLang();
  return (
    <details className="card" id={id} data-status={status} onToggle={(e) => onToggle?.(e.currentTarget.open)}>
      <summary>
        <span className="card-icon">
          <Icon name={icon} />
        </span>
        <span className="card-title">{t(title)}</span>
        {result && (
          <span className="card-result" data-tone={result.tone}>
            {result.text}
          </span>
        )}
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

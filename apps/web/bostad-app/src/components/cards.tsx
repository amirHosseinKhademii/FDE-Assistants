import type { Profile } from "@bostad/property";
import { useLang } from "../lib/lang";
import type { Check, Reason } from "../lib/checks";
import type { MessageKey } from "../lib/i18n";
import { clockTime, googleMapsHref, sourceHref, sourceKey, walkMinutes } from "../lib/format";
import { ProfileCard } from "./ProfileCard";
import type { CardStatus } from "./StatusPill";

const REASON: Record<Reason, MessageKey> = {
  notExact: "reason.notExact",
  noAddress: "reason.noAddress",
  noMatch: "reason.noMatch",
  sourceDown: "reason.sourceDown",
};

type Props<T> = { check: Check<T>; onRetry: () => void };

/** Shared wiring: status, reason, source footer and time for a checked or failed card. */
function useCheckProps<T>(check: Check<T>, onRetry: () => void) {
  const { lang, t } = useLang();
  if (check.kind === "failed") {
    return { status: "failed" as CardStatus, reason: REASON[check.reason], onRetry };
  }
  return {
    status: "checked" as CardStatus,
    checkedAt: clockTime(check.checkedAt, lang),
    source: { name: t(sourceKey(check.source)), href: sourceHref(check.source) },
  };
}

export function GroundCard({ check, onRetry }: Props<NonNullable<Profile["landslide"]["data"]>>) {
  const { t } = useLang();
  const meta = useCheckProps(check, onRetry);
  return (
    <ProfileCard icon="mountain" title="card.ground.title" explain="card.ground.explain" {...meta}>
      {check.kind === "ok" && (
        <dl className="kv">
          <dt>{t("card.ground.inArea")}</dt>
          <dd>
            <strong style={{ color: check.data.inRiskArea ? "var(--risk)" : "var(--ok)" }}>
              {check.data.inRiskArea ? t("card.ground.yes") : t("card.ground.no")}
            </strong>
          </dd>
        </dl>
      )}
      {check.kind === "ok" && check.data.inRiskArea && (
        <p className="muted">{t("card.ground.zones", { count: check.data.features.length })}</p>
      )}
    </ProfileCard>
  );
}

export function TransportCard({ check, onRetry }: Props<NonNullable<Profile["transit"]["data"]>>) {
  const { t } = useLang();
  const meta = useCheckProps(check, onRetry);
  return (
    <ProfileCard icon="bus" title="card.transport.title" explain="card.transport.explain" {...meta}>
      {check.kind === "ok" &&
        (check.data.stops.length === 0 ? (
          <p className="muted">{t("card.transport.none")}</p>
        ) : (
          <ol className="stops">
            {check.data.stops.map((stop) => (
              <li key={stop.id || stop.name}>
                <span>{stop.name}</span>
                <span className="dist">
                  {t("card.transport.walk", { minutes: walkMinutes(stop.distanceMeters) })} ·{" "}
                  {t("card.transport.meters", { meters: stop.distanceMeters })}
                </span>
              </li>
            ))}
          </ol>
        ))}
    </ProfileCard>
  );
}

export function LocationCard({ check, onRetry }: Props<NonNullable<Profile["location"]["data"]>>) {
  const { t } = useLang();
  const meta = useCheckProps(check, onRetry);
  return (
    <ProfileCard icon="pin" title="card.location.title" explain="card.location.explain" {...meta}>
      {check.kind === "ok" && (
        <>
          <p>{check.data.displayName}</p>
          <dl className="kv">
            <dt>{t("card.location.coords")}</dt>
            <dd>
              {check.data.lat.toFixed(5)}, {check.data.lon.toFixed(5)}
            </dd>
          </dl>
          <a
            className="btn-secondary"
            style={{ justifySelf: "start" }}
            href={googleMapsHref(check.data.lat, check.data.lon)}
            target="_blank"
            rel="noreferrer"
          >
            {t("card.location.openMaps")}
          </a>
        </>
      )}
    </ProfileCard>
  );
}

export function ComingSoonCard({
  icon,
  title,
  explain,
}: {
  icon: "building" | "leaf" | "tag" | "clipboard" | "wave";
  title: MessageKey;
  explain: MessageKey;
}) {
  return <ProfileCard icon={icon} title={title} explain={explain} status="soon" />;
}

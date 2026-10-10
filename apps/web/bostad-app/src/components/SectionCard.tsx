import { Chip, Mono, Panel, type Tone } from '@fde/uikit';
import type { Profile, SectionStatus } from '@bostad/property';

type Section = { status: SectionStatus; reason?: string; source: string; fetchedAt: string };
type Location = NonNullable<Profile['location']['data']>;
type Landslide = NonNullable<Profile['landslide']['data']>;
type Transit = NonNullable<Profile['transit']['data']>;

const STATUS: Record<SectionStatus, { label: string; tone: Tone }> = {
  ok: { label: 'ok', tone: 'ok' },
  unavailable: { label: 'unavailable', tone: 'info' },
  error: { label: 'error', tone: 'danger' },
};

/** A source is shown as a link only when it is a URL or a bare hostname. */
function sourceHref(source: string): string | null {
  if (/^https?:\/\//.test(source)) return source;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(source)) return `https://${source}`;
  return null;
}

function Body({ id, section }: { id: string; section: Section & { data?: unknown } }) {
  if (section.status !== 'ok') {
    return <p className="text-ui-dim">{section.reason ?? 'No data.'}</p>;
  }
  if (id === 'location') {
    const d = section.data as Location;
    const lat = d.lat.toFixed(5);
    const lon = d.lon.toFixed(5);
    return (
      <div className="grid gap-2">
        <p>{d.displayName}</p>
        <p className="font-mono text-sm text-ui-dim">
          {lat}, {lon}
        </p>
        <a
          className="text-ui-accent underline underline-offset-4"
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`}
          target="_blank"
          rel="noreferrer"
        >
          Show on OpenStreetMap
        </a>
      </div>
    );
  }
  if (id === 'landslide') {
    const d = section.data as Landslide;
    return (
      <p>
        In landslide risk area:{' '}
        <strong className={d.inRiskArea ? 'text-ui-warn' : 'text-ui-ok'}>
          {d.inRiskArea ? 'yes' : 'no'}
        </strong>
        {d.inRiskArea && d.features.length > 0 && (
          <span className="text-ui-dim"> ({d.features.length} area{d.features.length === 1 ? '' : 's'})</span>
        )}
      </p>
    );
  }
  if (id === 'transit') {
    const d = section.data as Transit;
    if (d.stops.length === 0) return <p className="text-ui-dim">No stops found nearby.</p>;
    return (
      <ol className="grid gap-2">
        {d.stops.slice(0, 3).map((s) => (
          <li key={s.id} className="flex items-baseline justify-between gap-4">
            <span>{s.name}</span>
            <Mono className="shrink-0 text-ui-dim">{Math.round(s.distanceMeters)} m</Mono>
          </li>
        ))}
      </ol>
    );
  }
  return null;
}

export function SectionCard({
  id,
  title,
  section,
}: {
  id: string;
  title: string;
  section: Section & { data?: unknown };
}) {
  const status = STATUS[section.status];
  const href = sourceHref(section.source);
  return (
    <Panel
      title={title}
      tone={status.tone}
      icon={<Chip tone={status.tone}>{status.label}</Chip>}
    >
      <div className="grid gap-4 px-5 py-4">
        <Body id={id} section={section} />
        <div className="grid gap-1 border-t border-ui-line pt-3 text-xs text-ui-faint">
          <span>
            Source:{' '}
            {href ? (
              <a className="underline underline-offset-4 break-all" href={href} target="_blank" rel="noreferrer">
                {section.source}
              </a>
            ) : (
              <Mono>{section.source}</Mono>
            )}
          </span>
          <span>
            Fetched: <Mono>{new Date(section.fetchedAt).toLocaleString('sv-SE')}</Mono>
          </span>
        </div>
      </div>
    </Panel>
  );
}

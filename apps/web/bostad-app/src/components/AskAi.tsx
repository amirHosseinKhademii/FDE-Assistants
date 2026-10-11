import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useLang } from "../lib/lang";
import type { MessageKey } from "../lib/i18n";
import { Icon, type IconName } from "./Icons";
import { OriginDialog, originOf, type Origin } from "@fde/uikit";

/**
 * "Ask AI about this address". The button sits beside the address subtitle and
 * opens a dialog that grows out of it. Client side only: it talks to /api/ask
 * and never imports the server package. Hidden unless the server reports the
 * feature as enabled.
 */

type Fact = { claim: string; section: string; value: string };
type Answer = { answer: string; facts: Fact[]; not_in_data: string[]; escalate: boolean };
type AskResponse = { answer: Answer | null; errors: string[] };

const QUESTION_MIN = 3;
const QUESTION_MAX = 300;

/** One flag per page load, so every profile render shares one request. */
let enabledCache: Promise<boolean> | null = null;
function askEnabled(): Promise<boolean> {
  if (!enabledCache) {
    enabledCache = fetch("/api/ask", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((body: { enabled?: boolean }) => body.enabled === true)
      .catch(() => false);
  }
  return enabledCache;
}

/** Section names from the answer contract, mapped to the labels the profile cards already use. */
const SECTION_LABEL: Record<string, MessageKey> = {
  location: "card.location.title",
  landslide: "card.ground.title",
  transit: "card.transport.title",
  noise: "card.noise.title",
  district: "card.hood.district",
  income: "card.hood.income",
  places: "card.places.title",
  area: "area.title",
  price: "area.title",
  safety: "safety.title",
  brf: "card.brf.title",
  energy: "card.energy.title",
};

/** Icon and hue per section. Icons are the summary tiles' own set; hues are CSS variables in app.css. */
const SECTION_LOOK: Record<string, { icon: IconName; hue: string }> = {
  location: { icon: "pin", hue: "var(--sec-location)" },
  landslide: { icon: "mountain", hue: "var(--sec-ground)" },
  transit: { icon: "bus", hue: "var(--sec-transit)" },
  noise: { icon: "sound", hue: "var(--sec-noise)" },
  district: { icon: "building", hue: "var(--sec-district)" },
  income: { icon: "houseTag", hue: "var(--sec-price)" },
  places: { icon: "pin", hue: "var(--sec-places)" },
  area: { icon: "houseTag", hue: "var(--sec-price)" },
  price: { icon: "houseTag", hue: "var(--sec-price)" },
  safety: { icon: "shield", hue: "var(--sec-safety)" },
  brf: { icon: "building", hue: "var(--sec-brf)" },
  energy: { icon: "bolt", hue: "var(--sec-energy)" },
};
const FALLBACK_LOOK = SECTION_LOOK.district;

/** The three example questions. Each one fills the field and is asked at once. */
const CHIPS: MessageKey[] = ["ask.chip.tram", "ask.chip.noise", "ask.chip.brf"];

type Turn = { id: number; question: string; status: "pending" | "done" | "failed"; response?: AskResponse };

/** The header button. Renders nothing until the server says Ask is enabled. */
export function AskAiButton({ address }: { address: string }) {
  const { t } = useLang();
  const [enabled, setEnabled] = useState(false);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    askEnabled().then((on) => {
      if (live) setEnabled(on);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!enabled) return null;

  function close() {
    setOrigin(null);
    button.current?.focus({ preventScroll: true });
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        className="ask-open"
        aria-haspopup="dialog"
        onClick={() => {
          if (button.current) setOrigin(originOf(button.current));
        }}
      >
        <span className="ask-open-mark" aria-hidden="true">
          <Icon name="sparkle" />
        </span>
        <span>{t("ask.open")}</span>
      </button>
      {origin && <AskDialog key={address} address={address} from={origin} onClose={close} />}
    </>
  );
}

function AskDialog({ address, from, onClose }: { address: string; from: Origin; onClose: () => void }) {
  const { t } = useLang();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const newest = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Desktop only: a phone would open the keyboard on arrival.
  useEffect(() => {
    if (window.matchMedia("(min-width: 640px)").matches) input.current?.focus({ preventScroll: true });
  }, []);

  // The newest question moves to the top of the thread, so the answer reads from its start.
  useEffect(() => {
    newest.current?.scrollIntoView({ block: "start" });
  }, [turns.length]);

  const trimmed = draft.trim();
  const lengthMessage =
    trimmed.length > 0 && trimmed.length < QUESTION_MIN
      ? t("ask.tooShort")
      : trimmed.length > QUESTION_MAX
        ? t("ask.tooLong")
        : null;

  async function ask(text: string) {
    const question = text.trim();
    if (busy || question.length < QUESTION_MIN || question.length > QUESTION_MAX) return;
    const id = ++seq.current;
    setBusy(true);
    setDraft("");
    setTurns((cur) => [...cur, { id, question, status: "pending" }]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ address, question }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const response = (await res.json()) as AskResponse;
      setTurns((cur) => cur.map((x) => (x.id === id ? { ...x, status: "done", response } : x)));
    } catch {
      setTurns((cur) => cur.map((x) => (x.id === id ? { ...x, status: "failed" } : x)));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void ask(draft);
  }

  const canSend = !busy && trimmed.length >= QUESTION_MIN && trimmed.length <= QUESTION_MAX;

  return (
    <OriginDialog
      from={from}
      tone="var(--accent)"
      label={t("ask.dialogTitle")}
      onClose={onClose}
      header={
        <>
          <span className="ask-head-mark" aria-hidden="true">
            <Icon name="sparkle" />
          </span>
          <div className="ask-head-text">
            <h2 className="ask-head-title">{t("ask.dialogTitle")}</h2>
            <p className="ask-head-address">{address}</p>
          </div>
        </>
      }
    >
      <div className="ask-panel">
        <div className="ask-thread" role="log" aria-live="polite">
          {turns.length === 0 && (
            <div className="ask-examples">
              <p className="ask-examples-lead">{t("ask.examples")}</p>
              <div className="ask-chips">
                {CHIPS.map((key) => (
                  <button key={key} type="button" className="ask-chip" disabled={busy} onClick={() => void ask(t(key))}>
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {turns.map((turn, i) => (
            <article
              key={turn.id}
              className="ask-turn"
              ref={i === turns.length - 1 ? newest : undefined}
            >
              <p className="ask-bubble">{turn.question}</p>
              {turn.status === "pending" && <AskSkeleton label={t("ask.loading")} />}
              {turn.status === "failed" && (
                <p className="ask-failed" role="alert">
                  {t("ask.error")}
                </p>
              )}
              {turn.status === "done" && <AskResult response={turn.response} />}
            </article>
          ))}
        </div>

        <div className="ask-dock">
          <form className="ask-composer" onSubmit={submit}>
            <label className="sr-only" htmlFor="ask-question">
              {t("ask.title")}
            </label>
            <input
              ref={input}
              id="ask-question"
              className="ask-input"
              type="text"
              value={draft}
              maxLength={QUESTION_MAX + 50}
              placeholder={t("ask.placeholder")}
              onChange={(e) => setDraft(e.target.value)}
              disabled={busy}
              autoComplete="off"
            />
            <button type="submit" className="ask-send" aria-label={t("ask.send")} disabled={!canSend}>
              <Icon name="send" />
            </button>
          </form>
          {lengthMessage && <p className="ask-hint">{lengthMessage}</p>}
          <p className="ask-footer">{t("ask.notice")}</p>
        </div>
      </div>
    </OriginDialog>
  );
}

/** Three shimmering lines while the answer is on its way. Motion is switched off by the reduced-motion rule. */
function AskSkeleton({ label }: { label: string }) {
  return (
    <div className="ask-skeleton" role="status" aria-label={label}>
      <span />
      <span />
      <span />
    </div>
  );
}

function AskResult({ response }: { response?: AskResponse }) {
  const { t } = useLang();
  const answer = response?.answer ?? null;
  const errors = response?.errors ?? [];
  if (!answer) return <p className="ask-status">{t("ask.noAnswer")}</p>;

  return (
    <div className="ask-answer">
      <p className="ask-lead">{answer.answer}</p>

      {answer.facts.length > 0 && (
        <>
          <h3 className="ask-heading">{t("ask.facts")}</h3>
          <ul className="ask-facts">
            {answer.facts.map((f, i) => {
              const look = SECTION_LOOK[f.section] ?? FALLBACK_LOOK;
              return (
                <li key={i} className="ask-fact" style={{ "--sec": look.hue } as CSSProperties}>
                  <span className="ask-badge" aria-hidden="true">
                    <Icon name={look.icon} />
                  </span>
                  <span className="ask-claim">
                    {f.claim} <strong>{f.value}</strong>
                  </span>
                  <span className="ask-source">{SECTION_LABEL[f.section] ? t(SECTION_LABEL[f.section]) : f.section}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {answer.not_in_data.length > 0 && (
        <div className="ask-missing">
          <Icon name="info" className="ask-missing-icon" />
          <div>
            <p className="ask-missing-title">{t("ask.notInData")}</p>
            <ul>
              {answer.not_in_data.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {answer.escalate && <p className="ask-escalate">{t("ask.escalate")}</p>}

      {errors.length > 0 && (
        <div className="ask-checks" role="note">
          <p className="ask-checks-title">{t("ask.failedChecks")}</p>
          <details>
            <summary>{t("ask.checkDetails")}</summary>
            <ul>
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}

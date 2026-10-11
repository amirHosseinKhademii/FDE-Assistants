import { useEffect, useState, type FormEvent } from "react";
import { useLang } from "../lib/lang";
import type { MessageKey } from "../lib/i18n";
import { ProfileCard } from "./ProfileCard";

/**
 * "Ask about this address". Client side only: it talks to /api/ask and never
 * imports the server package. The card is hidden unless the server reports the
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

export function AskCard({ address }: { address: string }) {
  const { t } = useLang();
  const [enabled, setEnabled] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);

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

  const trimmed = question.trim();
  const lengthMessage =
    trimmed.length > 0 && trimmed.length < QUESTION_MIN
      ? t("ask.tooShort")
      : trimmed.length > QUESTION_MAX
        ? t("ask.tooLong")
        : null;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || trimmed.length < QUESTION_MIN || trimmed.length > QUESTION_MAX) return;
    setBusy(true);
    setFailed(null);
    setResult(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ address, question: trimmed }),
      });
      if (!res.ok) {
        setFailed(t("ask.error"));
        return;
      }
      setResult((await res.json()) as AskResponse);
    } catch {
      setFailed(t("ask.error"));
    } finally {
      setBusy(false);
    }
  }

  const answer = result?.answer ?? null;

  return (
    <>
      <ProfileCard id="card-ask" icon="search" title="ask.title" explain="ask.explain">
        <form className="ask-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="ask-question">
            {t("ask.title")}
          </label>
          <input
            id="ask-question"
            type="text"
            value={question}
            maxLength={QUESTION_MAX + 50}
            placeholder={t("ask.placeholder")}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={busy}
          />
          <button type="submit" className="btn-primary" disabled={busy || trimmed.length < QUESTION_MIN || trimmed.length > QUESTION_MAX}>
            {t("ask.submit")}
          </button>
        </form>
        {lengthMessage && <p className="ask-hint muted">{lengthMessage}</p>}
        {busy && <p className="ask-status muted" role="status">{t("ask.loading")}</p>}
        {failed && <p className="ask-status" role="alert">{failed}</p>}

        {result && !answer && <p className="ask-status muted">{t("ask.noAnswer")}</p>}

        {answer && (
          <div className="ask-answer" aria-live="polite">
            <p className="ask-text">{answer.answer}</p>

            {answer.facts.length > 0 && (
              <>
                <h3 className="ask-heading">{t("ask.facts")}</h3>
                <ul className="ask-facts">
                  {answer.facts.map((f, i) => (
                    <li key={i} className="ask-fact">
                      <span className="ask-claim">
                        {f.claim} <strong>{f.value}</strong>
                      </span>
                      <span className="ask-chip">{SECTION_LABEL[f.section] ? t(SECTION_LABEL[f.section]) : f.section}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {answer.not_in_data.length > 0 && (
              <>
                <h3 className="ask-heading">{t("ask.notInData")}</h3>
                <ul className="ask-missing">
                  {answer.not_in_data.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </>
            )}

            {answer.escalate && <p className="ask-hint muted">{t("ask.escalate")}</p>}
            {(result?.errors.length ?? 0) > 0 && <p className="alert ask-checks">{t("ask.failedChecks")}</p>}
          </div>
        )}
      </ProfileCard>
      <p className="ask-notice muted">{t("ask.notice")}</p>
    </>
  );
}

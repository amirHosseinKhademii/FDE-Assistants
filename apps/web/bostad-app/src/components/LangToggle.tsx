import { useLang } from "../lib/lang";
import { LANGS, type Lang } from "../lib/i18n";

const LABEL: Record<Lang, string> = { en: "EN", sv: "SV" };

export function LangToggle() {
  const { lang, setLang, t } = useLang();
  return (
    <div className="lang" role="group" aria-label={t("nav.language")}>
      {LANGS.map((code) => (
        <button key={code} type="button" aria-pressed={lang === code} onClick={() => setLang(code)}>
          {LABEL[code]}
        </button>
      ))}
    </div>
  );
}

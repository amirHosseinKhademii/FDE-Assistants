import { useLang } from "../lib/lang";
import { useTheme, type ThemePref } from "../lib/theme";
import { Icon, type IconName } from "./Icons";

const ICON: Record<ThemePref, IconName> = { light: "sun", dark: "moon", system: "display" };
const NEXT: Record<ThemePref, ThemePref> = { light: "dark", dark: "system", system: "light" };

/** One icon button that cycles Light → Dark → System. The label names the current state. */
export function ThemeToggle() {
  const { t } = useLang();
  const { pref, setPref } = useTheme();
  const label = t(`theme.${pref}`);
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`${t("nav.theme")}: ${label}`}
      title={`${t("nav.theme")}: ${label}`}
      data-pref={pref}
      onClick={() => setPref(NEXT[pref])}
    >
      <Icon name={ICON[pref]} />
      <span className="sr-only">{label}</span>
    </button>
  );
}

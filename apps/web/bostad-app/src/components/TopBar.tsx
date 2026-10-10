import { Link } from "@tanstack/react-router";
import { useLang } from "../lib/lang";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
  const { t } = useLang();
  return (
    <header className="topbar">
      <Link to="/" className="wordmark">
        {t("brand")}
      </Link>
      <div className="topbar-actions">
        <LangToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useLang } from "../lib/lang";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The top bar. As an overlay (the phone profile) it floats over the map: the
 * wordmark and the language and theme controls, with the search slot at the far right.
 */
export function TopBar({ overlay = false, search, searching = false }: { overlay?: boolean; search?: ReactNode; searching?: boolean }) {
  const { t } = useLang();
  return (
    <header className={`topbar${overlay ? " is-overlay" : ""}${searching ? " is-searching" : ""}`}>
      <Link to="/" className="wordmark">
        {t("brand")}
      </Link>
      <div className="topbar-actions">
        <LangToggle />
        <ThemeToggle />
      </div>
      {search}
    </header>
  );
}

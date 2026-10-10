import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import appCss from "../styles/app.css?url";
import { LangProvider } from "../lib/lang";
import { THEME_SCRIPT, ThemeProvider } from "../lib/theme";
import { MapsProvider } from "../components/MapsProvider";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light dark" },
      { title: "Bostad" },
    ],
    links: [
      // Open the connections to Google before the first keystroke needs them.
      // Stops the browser asking for /favicon.ico, which this app does not serve (it was the one 404).
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://maps.googleapis.com" },
      { rel: "preconnect", href: "https://maps.gstatic.com", crossOrigin: "anonymous" },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  return (
    // suppressHydrationWarning: the theme script may set data-theme before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* First, and before the stylesheet: it sets data-theme from the saved choice. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* A plain stylesheet link, not one from head(): React 19 hoists those above the script. */}
        <link rel="stylesheet" href={appCss} />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <LangProvider>
            <MapsProvider>
              <Outlet />
            </MapsProvider>
          </LangProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

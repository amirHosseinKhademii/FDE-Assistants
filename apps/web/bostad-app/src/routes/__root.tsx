import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import appCss from "../styles/app.css?url";
import { LangProvider } from "../lib/lang";
import { MapsProvider } from "../components/MapsProvider";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light" },
      { title: "Bostad" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <LangProvider>
          <MapsProvider>
            <Outlet />
          </MapsProvider>
        </LangProvider>
        <Scripts />
      </body>
    </html>
  );
}

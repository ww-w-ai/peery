import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  NavLink,
} from "react-router";
import type { LinksFunction } from "react-router";
import stylesheet from "./tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export default function Root() {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-gray-50 text-gray-900 antialiased">
        <div className="flex min-h-full flex-col">
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function Header() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${isActive ? "text-emerald-700" : "text-gray-600 hover:text-gray-900"}`;

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <NavLink to="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span className="text-2xl" aria-hidden="true">&#x1F42F;</span>
          <span>Peery</span>
        </NavLink>
        <nav className="flex items-center gap-6">
          <NavLink to="/" className={linkClass} end>Home</NavLink>
          <NavLink to="/skills" className={linkClass}>Skills</NavLink>
          <NavLink to="/flagged" className={linkClass}>Unverified</NavLink>
          <NavLink to="/submit" className={linkClass}>Submit</NavLink>
          <NavLink to="/about" className={linkClass}>About</NavLink>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <p className="text-center text-xs text-gray-500">
          Verifications use AI-assisted analysis. Results are automated opinion, not certification.
        </p>
        <div className="mt-2 flex justify-center gap-4">
          <a href="/terms" className="text-xs text-gray-400 hover:text-gray-600">Terms</a>
          <a href="/privacy" className="text-xs text-gray-400 hover:text-gray-600">Privacy</a>
        </div>
      </div>
    </footer>
  );
}

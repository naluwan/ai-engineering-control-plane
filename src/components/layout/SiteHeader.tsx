import Link from "next/link";

import { NavLink } from "@/components/layout/NavLink";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/projects", label: "Projects" },
  { href: "/docs", label: "Documentation" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-foreground/10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          AI Engineering Control Plane
        </Link>

        <nav aria-label="Main">
          <ul className="flex items-center gap-1 sm:gap-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

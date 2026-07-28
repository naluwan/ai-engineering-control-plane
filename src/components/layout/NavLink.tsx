"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

const BASE_CLASS =
  "rounded-md px-2 py-1 text-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current";

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({ href, children, className }: NavLinkProps) {
  const pathname = usePathname();
  const current = isCurrent(pathname, href);

  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={[
        BASE_CLASS,
        current ? "font-medium text-foreground" : "text-foreground/60",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Link>
  );
}

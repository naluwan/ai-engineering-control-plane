import Link from "next/link";

import { PageHeader } from "@/components/ui/PageHeader";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16 sm:py-24">
      <PageHeader
        eyebrow="404"
        title="Page not found"
        description="That route does not exist. The application shell currently serves the overview, projects and documentation pages only."
      />

      <Link
        href="/"
        className="self-start text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        Back to overview
      </Link>
    </div>
  );
}

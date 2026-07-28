import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ProjectsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12 sm:py-16">
      <PageHeader
        eyebrow="Placeholder"
        title="Projects"
        description="A project connects a repository to the requirements, plans and agent runs derived from it."
      />

      <EmptyState
        title="No projects yet"
        description="Project management is not implemented yet. Creating, listing and viewing projects arrives in TASK-006, once the database foundation and the projects API are in place."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">TASK-006</Badge>
          <Link
            href="/docs"
            className="text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Read the roadmap
          </Link>
        </div>
      </EmptyState>
    </div>
  );
}

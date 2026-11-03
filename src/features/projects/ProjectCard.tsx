import { Link } from "@tanstack/react-router";
import type { Project } from "@/lib/types";
import { useDB } from "@/services/db";
import { projectSummary } from "@/services/selectors";
import { PROJECT_STATUSES } from "@/lib/constants";
import { Pill, SampleBadge } from "@/components/tc/common";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import { Bug, Lightbulb, ListChecks, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProjectStatusPill({ status }: { status: Project["status"] }) {
  const s = PROJECT_STATUSES.find((x) => x.value === status)!;
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function ProjectIcon({ p, size = "md" }: { p: Project; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-xl bg-accent", size === "sm" ? "size-8 text-base" : size === "lg" ? "size-14 text-3xl" : "size-10 text-xl")} aria-hidden="true">
      {p.icon || "📦"}
    </span>
  );
}

export function ProjectCard({ p, variant = "library" }: { p: Project; variant?: "library" | "resume" }) {
  const db = useDB();
  const s = projectSummary(db, p);
  const compact = db.preferences.density === "compact";
  return (
    <article className={cn("surface-card flex flex-col transition hover:shadow-lift", compact ? "gap-2 p-3" : "gap-3 p-4")}>
      <div className="flex items-start gap-3">
        <ProjectIcon p={p} size={compact ? "sm" : "md"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to="/projects/$projectId" params={{ projectId: p.id }} className="truncate font-semibold hover:underline">{p.name}</Link>
            <SampleBadge show={p.isSample} />
          </div>
          <p className={cn("text-sm text-muted-foreground", compact ? "line-clamp-1" : "line-clamp-2")}>{p.shortDescription || <span className="italic">No description recorded</span>}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <ProjectStatusPill status={p.status} />
        {p.technologies.slice(0, 3).map((t) => <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{t}</span>)}
        {p.technologies.length > 3 && <span className="text-[11px] text-muted-foreground">+{p.technologies.length - 3}</span>}
      </div>

      {variant === "resume" ? (
        <div className="space-y-2 rounded-lg bg-surface p-3 text-sm">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Stopped at {s.lastSession ? `· ${fmtDate(s.lastSession.date)}` : ""}</div>
            <p className="line-clamp-2">{s.lastSession?.stoppingPoint || <span className="italic text-muted-foreground">No stopping point recorded</span>}</p>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">My next step</div>
            {s.nextStep ? <p className="line-clamp-2">{s.nextStep}</p> : (
              <Link to="/resume/$projectId" params={{ projectId: p.id }} className="text-sm italic text-primary hover:underline">No next step recorded yet — add one</Link>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" title="Features marked working out of recorded features"><ListChecks className="size-3.5" />{s.featureCount ? `${s.workingFeatures}/${s.featureCount} marked working` : "No features recorded"}</span>
          <span className={cn("flex items-center gap-1", s.openBugs > 0 && "text-danger")}><Bug className="size-3.5" />{s.openBugs} open</span>
          <span className="flex items-center gap-1"><Lightbulb className="size-3.5" />{s.unreviewedIdeas} unreviewed</span>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span>Updated {fmtDate(p.updatedAt)} · Reviewed {fmtDate(p.lastReviewedAt, "never")}</span>
        <div className="flex gap-1.5">
          {variant === "resume" && (
            <Button asChild size="sm" variant="ghost"><Link to="/projects/$projectId" params={{ projectId: p.id }}>View workspace</Link></Button>
          )}
          <Button asChild size="sm" variant={variant === "resume" ? "default" : "secondary"}>
            <Link to="/resume/$projectId" params={{ projectId: p.id }}><PlayCircle /> Resume</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

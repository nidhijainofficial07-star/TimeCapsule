import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toneFor, type Tone } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CloudOff, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { getDB } from "@/services/db";

export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="tc-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <rect x="9" y="3" width="22" height="34" rx="11" fill="url(#tc-g)" />
      <rect x="9" y="19" width="22" height="2" fill="var(--background)" opacity="0.5" />
      <circle cx="20" cy="20" r="6.5" fill="var(--background)" />
      <path d="M20 16.2v4l2.6 1.6" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Logo />
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className="font-display text-[15px] font-semibold truncate">Project TimeCapsule</div>
          <div className="text-[11px] text-muted-foreground italic truncate">Save today. Rediscover tomorrow.</div>
        </div>
      )}
    </div>
  );
}

export function Pill({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn(`tone-${tone}`, "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", className)}>
      {children}
    </span>
  );
}

export function StatusPill({ value }: { value: string }) {
  if (!value) return null;
  return <Pill tone={toneFor(value)}>{value}</Pill>;
}

export function SampleBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span className="rounded border border-dashed border-primary/50 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary" title="Demonstration data — not a personal record">
      Sample
    </span>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-surface/50 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-muted-foreground [&_svg]:size-7">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function NotRecorded({ children = "Not recorded yet" }: { children?: ReactNode }) {
  return <span className="text-sm italic text-muted-foreground">{children}</span>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("surface-card p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Run a save; show success only if it actually succeeded. */
export function attempt<T>(fn: () => T, success?: string): T | undefined {
  try {
    const r = fn();
    if (success) toast.success(success);
    return r;
  } catch (e) {
    toast.error("Not saved", { description: e instanceof Error ? e.message : "Something went wrong while saving." });
    return undefined;
  }
}

/** Minimal, safe markdown: headings, lists, code blocks, inline code, bold, links. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  if (!text?.trim()) return <NotRecorded />;
  const blocks: ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;
  const inline = (s: string, k: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    const re = /(`[^`]+`|\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let j = 0;
    while ((m = re.exec(s))) {
      if (m.index > last) parts.push(s.slice(last, m.index));
      const t = m[0];
      if (t.startsWith("`")) parts.push(<code key={k + j++}>{t.slice(1, -1)}</code>);
      else if (t.startsWith("**")) parts.push(<strong key={k + j++}>{t.slice(2, -2)}</strong>);
      else parts.push(<a key={k + j++} href={t} target="_blank" rel="noreferrer noopener">{t}</a>);
      last = m.index + t.length;
    }
    if (last < s.length) parts.push(s.slice(last));
    return parts;
  };
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(<pre key={i}><code>{code.join("\n")}</code></pre>);
      continue;
    }
    if (/^\s*[-*•]\s+/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*•]\s+/, ""));
      blocks.push(<ul key={i}>{items.map((t, k) => <li key={k}>{inline(t, `${i}-${k}`)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ""));
      blocks.push(<ol key={i}>{items.map((t, k) => <li key={k}>{inline(t, `${i}-${k}`)}</li>)}</ol>);
      continue;
    }
    if (l.startsWith("## ") || l.startsWith("# ")) blocks.push(<h3 key={i}>{l.replace(/^#+\s/, "")}</h3>);
    else if (l.startsWith("### ")) blocks.push(<h4 key={i}>{l.slice(4)}</h4>);
    else if (l.trim()) blocks.push(<p key={i}>{inline(l, String(i))}</p>);
    i++;
  }
  return <div className={cn("prose-tc text-sm break-words", className)}>{blocks}</div>;
}

export function DraftBar({ savedAt, error, dirty }: { savedAt: string | null; error: string | null; dirty: boolean }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status" aria-live="polite">
      {error ? (
        <span className="text-destructive">{error}</span>
      ) : savedAt ? (
        <>
          <CloudOff className="size-3.5" /> Draft kept in this browser · {fmtDateTime(savedAt)}
        </>
      ) : dirty ? (
        <>
          <Loader2 className="size-3.5 animate-spin" /> Saving draft…
        </>
      ) : (
        <>Drafts autosave locally while you type</>
      )}
    </p>
  );
}

export function RecoveredDraftBanner({ savedAt, onRestore, onDiscard }: { savedAt: string; onRestore: () => void; onDiscard: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg tone-warning px-3 py-2 text-sm">
      <span>An unsaved draft from {fmtDateTime(savedAt)} was found.</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onRestore}><RotateCcw /> Restore draft</Button>
        <Button size="sm" variant="ghost" onClick={onDiscard}><Trash2 /> Discard</Button>
      </div>
    </div>
  );
}

/** Confirmation dialog honouring the "confirm destructive actions" preference. */
export function useConfirm() {
  const [state, setState] = useState<{ title: string; body: string; confirm: string; destructive?: boolean; run: () => void } | null>(null);
  const ask = (opts: { title: string; body: string; confirm?: string; destructive?: boolean; force?: boolean }, run: () => void) => {
    if (!opts.force && !getDB().preferences.confirmDestructive) return run();
    setState({ confirm: "Confirm", ...opts, run });
  };
  const dialog = (
    <AlertDialog open={!!state} onOpenChange={(o) => !o && setState(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title}</AlertDialogTitle>
          <AlertDialogDescription>{state?.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={state?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            onClick={() => {
              state?.run();
              setState(null);
            }}
          >
            {state?.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { ask, dialog };
}

export function Stat({ label, value, icon, onClick, tone = "primary" }: { label: string; value: number; icon: ReactNode; onClick?: () => void; tone?: Tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="surface-card group flex items-center gap-3 p-3 text-left transition hover:shadow-lift hover:-translate-y-px focus-visible:outline-2"
    >
      <span className={cn(`tone-${tone}`, "grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-4.5")}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xl font-bold tabular-nums leading-none">{value}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{label}</span>
      </span>
    </button>
  );
}

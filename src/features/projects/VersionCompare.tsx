import { useState } from "react";
import { GitCompare } from "lucide-react";
import { useDB } from "@/services/db";
import { NativeSelect } from "@/components/tc/fields";
import { NotRecorded } from "@/components/tc/common";
import { splitList } from "@/lib/format";
import type { Version } from "@/lib/types";

const FIELDS: [keyof Version, string][] = [
  ["summary", "Summary"], ["changes", "Changelog"], ["featuresAdded", "Features added"], ["featuresImproved", "Features improved"],
  ["bugsFixed", "Bugs fixed"], ["limitations", "Known limitations"], ["resources", "Resources"], ["workingNotes", "What was working"],
];

export function VersionCompare({ projectId }: { projectId: string }) {
  const db = useDB();
  const versions = db.versions.filter((v) => v.projectId === projectId).sort((a, b) => (a.releaseDate || a.createdAt).localeCompare(b.releaseDate || b.createdAt));
  const [aId, setA] = useState(versions[versions.length - 2]?.id ?? "");
  const [bId, setB] = useState(versions[versions.length - 1]?.id ?? "");
  if (versions.length < 2) return <p className="text-sm text-muted-foreground">Add at least two versions to compare them.</p>;
  const a = versions.find((v) => v.id === aId);
  const b = versions.find((v) => v.id === bId);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <GitCompare className="size-4 text-primary" />
        <NativeSelect aria-label="First version" value={aId} onChange={(e) => setA(e.target.value)} className="w-auto">{versions.map((v) => <option key={v.id} value={v.id}>{v.label} {v.name}</option>)}</NativeSelect>
        <span className="text-sm">vs</span>
        <NativeSelect aria-label="Second version" value={bId} onChange={(e) => setB(e.target.value)} className="w-auto">{versions.map((v) => <option key={v.id} value={v.id}>{v.label} {v.name}</option>)}</NativeSelect>
      </div>
      {a && b && a.id !== b.id ? (
        <div className="grid gap-3 md:grid-cols-2">
          {FIELDS.map(([k, label]) => {
            const av = String(a[k] ?? "");
            const bv = String(b[k] ?? "");
            const al = splitList(av);
            const bl = splitList(bv);
            return (
              <div key={k} className="rounded-lg border p-3">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</h4>
                {!av && !bv ? <NotRecorded>Not recorded for either version</NotRecorded> : !av || !bv ? (
                  <p className="text-sm"><NotRecorded>Only recorded for {av ? a.label : b.label}</NotRecorded>: {av || bv}</p>
                ) : av === bv ? <p className="text-sm text-muted-foreground">Same in both</p> : (
                  <ul className="space-y-0.5 text-sm">
                    {bl.filter((x) => !al.includes(x)).map((x) => <li key={"+" + x} className="text-success">+ {x}</li>)}
                    {al.filter((x) => !bl.includes(x)).map((x) => <li key={"-" + x} className="text-danger">− {x}</li>)}
                    {al.filter((x) => bl.includes(x)).map((x) => <li key={"=" + x} className="text-muted-foreground">= {x}</li>)}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : <p className="text-sm text-muted-foreground">Pick two different versions.</p>}
    </div>
  );
}

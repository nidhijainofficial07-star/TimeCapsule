<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All archive data flows through `src/services/*` (db store + domain services); UI never touches localStorage directly, so a real backend can replace `services/storage.ts`/`db.ts` later.
- `mutate()` persists before updating state and throws on failure; UI wraps saves in `attempt()` so success is only shown after a real save.
- Record types (features, bugs, ideas, …) are driven by `src/features/records/config.ts`; add fields there rather than writing new forms.
- Snapshots store deep copies of recorded state; never make them reference live records.
- Workspace pages live under the `_workspace` pathless layout, which gates on the prototype session and renders only after hydration (browser-stored data).

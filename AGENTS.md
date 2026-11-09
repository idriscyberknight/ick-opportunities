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
- Discovery falls back to deterministic HTML extraction (src/lib/ai/fallback-extract.server.ts) when AI fails with 401/402/403/429; runs never stop for AI reasons and each source records its mode. Why: discovery must keep working without AI credits.

- In-app alerts are written only by the scheduled server worker (`/api/public/jobs/alerts`, cron-auth protected, service role); browsers may only read safe notification columns and mark read/dismiss. Why: users must never forge or see others' notifications.
- The alerts worker re-reads latest consent and publication state and recomputes its plan immediately before inserting; data access goes through the AlertWorkerStore seam so safety rules are unit-tested in memory. Why: withdrawn consent or withdrawn opportunities must never produce new notifications.

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

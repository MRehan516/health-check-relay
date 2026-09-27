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

## RecoverLine architecture rules
- Escalation decisions live in `src/lib/rule-engine.server.ts` as deterministic code; the AI only converts a free-text reply into a status, so clinical routing is never an AI judgement.
- Missed check-ins are recorded as CONTACT_FAILURE and never as a health decline; ambiguous replies map to UNCLEAR and never fall back to routine.
- App-internal logic uses `createServerFn` (`src/lib/recoverline.functions.ts`); the Twilio webhook and cron sweep are TanStack routes under `src/routes/api/public/`.

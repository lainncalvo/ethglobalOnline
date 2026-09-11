<!-- PRE-SUBMISSION: complete the Tools table, fill the Log with what actually happened, remove the placeholder rows, remove this comment. -->
# AI tools disclosure

ETHGlobal requires every submission to document where and how AI tools were used, and to include
the spec files, prompts and planning artifacts of any spec-driven workflow in the repository. This
file is that disclosure. Update it as the project progresses; the final version is part of the
submission.

## Tools

| Tool | Used for |
|---|---|
| Claude Code (Anthropic, model Claude Fable 5.1) | Research of sponsor rules and SDKs, planning, writing the specifications in `docs/specs/`, generating and refactoring code under human review, drafting documentation |
| _add others as used_ (e.g. IDE assistants, image generation for the diagram, transcription) | |

## Planning artifacts (committed)

- `PLAN.md` — master plan, lanes, gates, decision log.
- `docs/specs/00–09` — per-lane specifications with frozen interfaces and acceptance criteria.
- `docs/architecture.md`, `docs/decisions.md`, `docs/MAINNET.md`, `docs/specs/09-threat-model.md`.

These documents were produced on 2026-09-11 in a planning session between the team and Claude
Code. The team made every product and design decision (market mechanism, asset, cash leg, sponsor
tracks, task split); the AI researched the constraints, proposed options with trade-offs, and
wrote the resulting specifications.

## How code was produced

- Coding agents were given `PLAN.md` plus one spec and constrained to one directory each (the
  "agent brief template" in `PLAN.md` §0).
- All generated code was reviewed, run and tested by a team member before being committed. Every
  on-chain claim in the README or the video is backed by an explorer transaction executed by the
  team.
- Commit messages carry a `Co-Authored-By` trailer when an AI agent authored the change.

## What was not AI-generated

- The product thesis and the decision to build this project.
- The demo video narration (recorded by a team member; ETHGlobal forbids AI voice-over).
- Wallet keys, secrets and deployments (handled by the team).

## Log

| Date | Activity |
|---|---|
| 2026-09-11 | Planning session: research (Hedera ATS v8, Arc testnet, Chainlink CRE Confidential Workflows, ETHGlobal rules), decisions, specs written |
| _to be continued_ | |

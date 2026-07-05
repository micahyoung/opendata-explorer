---
name: analyze-chat-request
description: Given the two files extract-chat-request saves (a *-request.network-request and *-response.network-response pair), run a root-cause analysis of that chat session — why it felt broken to the user and what in the app or dataset caused it. Use whenever the user wants to know "why did this session go badly", "what caused the bad behavior in that captured request", or wants a post-mortem/RCA on a BYO-LLM conversation. Always run this instead of manually re-deriving the analysis turn-by-turn — it front-loads the same sequence (symptom → codebase cross-reference → live API verification → generalization → measurable hypotheses) as fixed steps.
---

# Analyze Chat Request

Runs a four-stage root-cause analysis over a captured chat-completions session. Unlike `extract-chat-request`, these input files are already de-sensitized (auth headers stripped during extraction), so read them directly — no subagent delegation needed for privacy here.

## 1. Locate & load inputs

Accept the two file paths as skill arguments (`<reqid>-request.network-request` and `<reqid>-response.network-response`). If not given, look for the most recent matching pair in `.debug/network-captures/`; if none exists, tell the user to run `/extract-chat-request` first and stop.

Before reading further, grep both files for secret-shaped patterns (`sk-[A-Za-z0-9_-]{20,}`, `Bearer `). If found, redact in place before proceeding — defense-in-depth in case someone points this skill at a non-extracted file. Then parse the request file's `messages` array (developer/system prompt, user turns, assistant tool calls, tool results) and note the `model` field.

## 2. Identify the pathology

Scan the transcript for concrete signals, not vague dissatisfaction. Look specifically for:
- A tool call that fails and gets retried with only a superficial parameter change (e.g. widening a geo radius) rather than a structural one (e.g. a different field or value) — a sign the retry loop is guessing blindly.
- The assistant asking the user to make a decision it already had enough information to make itself.
- The eventual fix coming from the user's own domain knowledge rather than from the assistant's self-correction.

State the symptom in 1-2 sentences from the user's point of view — "the user had to name the correct column themselves after three silent failures," not "a tool call returned an error."

## 3. Trace the root cause — two required sources of evidence

Don't assert a cause without evidence from both:

- **Codebase**: identify the dataset id(s) touched, locate the matching file in `src/config/datasets/`, and check whether the field descriptions/exemplars actually distinguish the fields the model confused. The transcript's `getDatasetDetails` tool result embeds a snapshot of this config — cross-reference against the live file too, in case it's since changed.
- **Live backend**: construct `curl` calls against the dataset's actual domain (Socrata `$where`/`$select`/`$group`, or ArcGIS REST query) to empirically confirm or refute the hypothesis about field/value distribution. A data-shape claim needs a curl result behind it, not a guess.

## 4. Generalize, then propose measurable hypotheses

- Sweep 3-5 related terms/fields via curl to check whether the same trap applies to other plausible prompts, and grep sibling dataset configs for the same structural shape (e.g. other category+subtype field pairs) to see whether the bug class recurs elsewhere in the catalog.
- Read `vision.md` (and `README.md` if needed) and propose **2 or more hypotheses for targeted changes**, preferring removals/simplifications over additions. State each as: the specific change, why it targets the traced root cause, a concrete measurable prediction (e.g. "mean tool calls to first non-empty result drops from X to Y across an N-prompt regression set"), and how to test it cheaply (replay a fixed prompt set, count tool calls). Check each proposal against the project's architectural guardrails (e.g. query-shape knowledge must be curated per-dataset, not inferred at runtime) and flag any proposal that would need a new runtime mechanism instead of a config/content edit.

## Output format

One report, four headed sections matching the stages above: **Pathology / Root Cause / Generalization / Hypotheses**. Keep it scannable regardless of which dataset or bug class triggered the session.

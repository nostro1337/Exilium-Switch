---
trigger: always_on
description: Mandatory rules for code intelligence, symbol exploration, impact analysis, and architecture navigation.
---

# Code Intelligence & Graph Navigation

When answering questions about the codebase, planning changes, fixing bugs, or refactoring:

## 1. Code-Level Intelligence (CodeGraph) — Primary Tool for Code
- **Always prioritize CodeGraph over manual grep/reads.** Before running multi-file `grep_search` or opening dozens of files:
  - Use `codegraph_explore` (or CLI `codegraph explore <query>`) to get symbol definitions, source snippets, and call paths in one shot.
  - Use `codegraph_impact` (or CLI `codegraph impact <symbol>`) BEFORE refactoring or modifying signatures to verify the blast radius across all files.
  - Use `codegraph_callers` / `codegraph_callees` to traverse function execution chains.
- Only fall back to `grep_search` or manual file inspection if a specific token or text string is not a recognized AST symbol.

## 2. High-Level Architecture & Knowledge Graph (Graphify) — Primary Tool for Concepts & Specs
- For high-level architecture planning, understanding system boundaries, or cross-referencing code with docs/specs:
  - Check if `graphify-out/` exists. If so, query `graphify query "<topic>"` or inspect `graphify-out/GRAPH_REPORT.md` / `graphify-out/wiki/`.
  - When starting a major new subsystem or analyzing large documentation, trigger Graphify extraction via `/graphify .` or `python -m graphify extract . --code-only`.

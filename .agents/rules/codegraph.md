---
trigger: always_on
description: Mandatory CodeGraph AST navigation, call-chain traversal, and blast radius rules.
---

# CodeGraph Rules

This project is indexed by CodeGraph in `.codegraph/`.

## Mandatory Rules for Code Navigation:
1. **Primary Code Search Tool:** Before performing multi-file `grep_search` or opening dozens of files manually, always use `codegraph_explore` (or CLI `codegraph explore <query>`).
2. **Blast Radius (Impact Analysis):** Before refactoring or changing interfaces/signatures, ALWAYS run `codegraph_impact <symbol>` to verify all affected locations across the codebase.
3. **Call Trees:** Use `codegraph_callers` and `codegraph_callees` to trace execution chains instead of guessing or scanning text.
4. **Fallback:** Only fall back to `grep_search` or manual file inspection if a specific token is not a recognized AST symbol (e.g. comments, arbitrary string literals).

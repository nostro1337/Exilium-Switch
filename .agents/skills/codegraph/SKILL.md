---
name: codegraph
description: "Surgical code intelligence knowledge graph. Use for exploring symbols, analyzing change impact (blast radius), tracing call hierarchies (callers/callees), and retrieving exact source contexts across the codebase without blind grep scans."
---

# CodeGraph Skill

Use CodeGraph for precise, AST-level code navigation, impact analysis, and architecture exploration.

## Capabilities & When to Use

| Task | Primary Command / Tool | Description |
| :--- | :--- | :--- |
| **Explore Context** | `codegraph explore "<query>"` / `codegraph_explore` | Retrieve relevant symbols' source code, signatures, and call paths in a single shot. |
| **Blast Radius (Impact)** | `codegraph impact "<symbol>"` / `codegraph_impact` | Identify all dependent files, functions, and interfaces that will be affected before editing a symbol. |
| **Find Callers** | `codegraph callers "<symbol>"` / `codegraph_callers` | List all functions/methods across the project that call the specified symbol. |
| **Find Callees** | `codegraph callees "<symbol>"` / `codegraph_callees` | List all functions/methods that a given symbol calls. |
| **Symbol Query** | `codegraph query "<name>"` | Search for symbols, interfaces, and types by name across the AST. |
| **Inspect Node / File** | `codegraph node "<target>"` / `codegraph_node` | Get complete definition and immediate neighborhood of a symbol or file. |
| **Index Status** | `codegraph status` | Verify SQLite index health, node/edge counts, and auto-sync status. |

## Instructions for Agents

1. **Prioritize CodeGraph over manual grep/read:**
   - When asked "Where is X implemented?", "How does Y connect to Z?", or "What calls method M?", use `codegraph_explore` or `codegraph callers`.
2. **Always check impact before refactoring:**
   - Before renaming, modifying parameters, or changing data structures, run `codegraph impact <symbol>` to review all downstream consumers.
3. **Auto-sync:**
   - The CodeGraph daemon watches the project and updates `.codegraph/` within 300ms of any file write. No manual re-indexing is required.

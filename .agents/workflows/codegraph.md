---
name: codegraph
description: Explore codebase symbols, call chains, and blast radius with CodeGraph
---

# Workflow: codegraph

Use this workflow to query code relationships, extract AST symbols, and trace call hierarchies.

## Quick Execution

1. **Context Exploration:**
   ```bash
   codegraph explore "<symbol or feature name>"
   ```
2. **Blast Radius Analysis (Impact):**
   ```bash
   codegraph impact "<symbol>"
   ```
3. **Trace Execution Flow:**
   ```bash
   codegraph callers "<symbol>"
   codegraph callees "<symbol>"
   ```
4. **Symbol Search:**
   ```bash
   codegraph query "<search term>"
   ```

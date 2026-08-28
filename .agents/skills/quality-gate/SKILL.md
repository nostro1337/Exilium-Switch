---
name: quality-gate
description: Comprehensive zero-regression Quality Gate for testing, impact analysis, code coverage verification (>=80%), and build validation. Use when developing features, fixing bugs, or verifying release readiness.
---

# Quality Gate & Release Verification Skill

This skill provides step-by-step instructions for executing the mandatory quality gate and zero-regression testing protocol.

## Step 1: Pre-Change Impact & Symbol Exploration
1. Use `codegraph_explore` to inspect related symbols and call hierarchies.
2. Use `codegraph_impact <symbol>` to evaluate blast radius before modifying contracts, DTOs, or IPC channels.

## Step 2: Layered Implementation (SoC)
Follow the dependency order:
1. `shared/types/` & `shared/ipc-channels.ts`
2. `electron/utils/`
3. `electron/services/`
4. `electron/ipc/`
5. `src/hooks/` & `src/components/`

## Step 3: Test Coverage & Regression Prevention
1. Add new tests or update existing ones in `tests/`.
2. Run coverage verification:
   ```bash
   npm run test:coverage
   ```
3. Ensure:
   - 100% tests pass (0 failed).
   - Line coverage (`% Lines`) is **>= 80%** (target 85-100%).

## Step 4: Typecheck & Production Build
Run:
```bash
npm run build
```
Verify zero TypeScript compilation errors.

## Step 5: Knowledge Graph Synchronization
Run:
```bash
python -m graphify update .
```

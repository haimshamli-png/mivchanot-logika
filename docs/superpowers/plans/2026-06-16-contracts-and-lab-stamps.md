# Contracts And Lab Stamps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add post-solve cognitive challenge contracts and show them as polished lab-stamp badges in the level select and win overlay.

**Architecture:** Keep contract logic in a small standalone browser/CommonJS module so it can be tested directly. Store earned contracts inside each existing level progress record as `contracts`, preserving the current `stars` and `bestMoves` migration path. Render contract progress from existing level records without adding a new screen.

**Tech Stack:** Vanilla JavaScript, DOM rendering in `game.js`, CSS custom-property themes in `style.css`, Node `assert` tests.

---

### Task 1: Contract Rules Module

**Files:**
- Create: `contracts.js`
- Create: `test/contracts.test.js`
- Modify: `package.json`
- Modify: `index.html`
- Modify: `scripts/build-capacitor-www.js`
- Modify: `service-worker.js`

- [ ] **Step 1: Write the failing test**

Create `test/contracts.test.js` with assertions for three contracts: exact optimum, no undo, and clean run with no illegal moves.

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/contracts.test.js`
Expected: FAIL because `contracts.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `contracts.js` exposing `CONTRACT_DEFS`, `evaluateContracts`, `mergeContracts`, and `countContracts` for both browser and CommonJS.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/contracts.test.js`
Expected: PASS.

### Task 2: Progress Integration

**Files:**
- Modify: `game.js`

- [ ] **Step 1: Write failing progress behavior into `test/contracts.test.js`**

Assert that `mergeContracts` preserves previously earned contracts and adds newly earned contracts.

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/contracts.test.js`
Expected: FAIL until merge behavior exists.

- [ ] **Step 3: Update `game.js`**

Track `undoCount` and `violationCount` in state, reset them in `loadLevelData`, increment them in `undo` and `showViolation`, evaluate contracts in `showSoloWin`, and persist them through `recordResult`.

- [ ] **Step 4: Run tests**

Run: `node test/contracts.test.js && npm test`
Expected: PASS.

### Task 3: Lab Stamp UI

**Files:**
- Modify: `index.html`
- Modify: `game.js`
- Modify: `style.css`

- [ ] **Step 1: Add win overlay host**

Add `<div id="win-contracts" class="contract-results"></div>` below the star hint.

- [ ] **Step 2: Render contract stamps**

Show earned/missed contract stamps on the win overlay and compact earned-count stamps on level cards.

- [ ] **Step 3: Style both themes**

Add `.contract-results`, `.contract-stamp`, and `.level-contracts` styles that read as lab stamps in nostalgic mode and neon certification chips in modern mode.

- [ ] **Step 4: Verify layout**

Run `npm test`, start a local server, and inspect the app in browser at desktop and mobile widths.

# PRD — Mizan Rules Engine
## Product Requirements Document

**Product:** Mizan Rules Engine — AI-Powered Policy-to-Execution Platform
**Version:** MVP 1.0
**Date:** February 2026
**Owner:** Abdullah Alkaabi

---

## Vision

A web platform that converts government policies and legal documents into deterministic, executable rules — powered by the Mizan Framework's Neuro-Symbolic architecture. Every decision is traceable, auditable, and regulatorily defensible.

---

## Target Users

- Government digital transformation officers
- Legal teams in regulated industries
- Policy analysts who need to operationalize legislation

---

## Tech Stack

- **Frontend:** Single-page HTML/CSS/JS (vanilla, no framework)
- **Backend:** Node.js Express API
- **Rules Engine:** JSON-based rule store with JS evaluation
- **LLM Integration:** OpenAI API (rule extraction)
- **Database:** JSON files (MVP) → PostgreSQL later
- **Styling:** Navy (#0B1F3A) + Gold (#D4AF37) — Mizan brand
- **Font:** Inter (Google Fonts)

---

## User Stories

### US-01: Landing Page
**As a** visitor
**I want to** see the Mizan Rules Engine homepage
**So that** I understand the product value proposition
**Acceptance Criteria:**
- Hero section with "Policy → Rules → Decisions" flow
- Mizan branding (navy + gold, ⚖️ logo)
- "Get Started" CTA button
- Feature highlights: Parse, Validate, Execute, Audit
- Footer with Mizan brand

### US-02: Policy Upload & Parsing
**As a** policy analyst
**I want to** paste or upload policy text and extract rules automatically
**So that** I don't manually write rules
**Acceptance Criteria:**
- Text area to paste policy/regulation text
- "Extract Rules" button calls OpenAI API
- LLM extracts structured rules (IF/THEN format)
- Shows extracted rules in editable card list
- Each rule has: name, condition, action, priority
- Loading state while extracting

### US-03: Rule Editor
**As a** policy analyst
**I want to** view, edit, and manage rules in a visual interface
**So that** I can validate and refine extracted rules
**Acceptance Criteria:**
- Rule list with cards (name, condition, action, status)
- Edit rule inline (click to edit)
- Add new rule manually
- Delete rule with confirmation
- Toggle rule active/inactive
- Rules saved to rules.json
- Conflict detection: warn if two rules have same condition

### US-04: Rule Execution Engine
**As a** developer/analyst
**I want to** submit a case/scenario and get a deterministic decision
**So that** I can automate policy-based decisions
**Acceptance Criteria:**
- "Test Decision" panel with JSON input form
- Submit case facts as key-value pairs
- Engine evaluates all active rules against the case
- Returns: Decision (APPROVED/REJECTED/REVIEW) + matched rule + reasoning
- Response shown in structured format
- Execution log with timestamp

### US-05: Audit Dashboard
**As a** compliance officer
**I want to** see a history of all decisions made
**So that** I can audit and explain every automated decision
**Acceptance Criteria:**
- Table of all decisions (timestamp, input, output, matched rule)
- Filter by decision type (APPROVED/REJECTED/REVIEW)
- Click row to see full decision detail
- Export to CSV button
- Decision count summary cards (total, approved, rejected, review)

### US-06: API Endpoint
**As a** developer
**I want to** call the rules engine via REST API
**So that** I can integrate decisions into external systems
**Acceptance Criteria:**
- POST /api/decide endpoint
- Accepts JSON: `{ "facts": { "key": "value" } }`
- Returns JSON: `{ "decision": "APPROVED", "rule": "rule-name", "reason": "..." }`
- GET /api/rules endpoint returns all active rules
- Simple API key auth (header: X-API-Key)
- API docs page with example curl commands

### US-07: Rule Conflict Detector
**As a** policy analyst
**I want to** detect conflicting or duplicate rules automatically
**So that** I don't deploy contradictory logic
**Acceptance Criteria:**
- "Run Conflict Check" button in Rule Editor
- Detects: duplicate conditions, circular references, overlapping ranges
- Shows conflicts as warning cards with explanation
- Suggests resolution for each conflict

### US-08: Demo Mode with Sample Policy
**As a** new user
**I want to** see a pre-loaded demo with a sample policy
**So that** I can understand the platform without starting from scratch
**Acceptance Criteria:**
- "Load Demo" button on upload page
- Pre-loads UAE Commercial License policy (simplified)
- 5 sample rules already extracted
- 3 sample decisions in audit log
- Clearly labeled as "Demo Mode"

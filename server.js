const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3456;
const API_KEY = process.env.API_KEY || 'mizan-rules-2026';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

const DATA_DIR = path.join(__dirname, 'data');
const RULES_FILE = path.join(DATA_DIR, 'rules.json');
const DECISIONS_FILE = path.join(DATA_DIR, 'decisions.json');
const DEMO_FILE = path.join(DATA_DIR, 'demo.json');

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helpers
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function genId() {
  return 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Auth middleware (skip for static & GET /)
function auth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key && key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
  next();
}
app.use('/api', auth);

// ---- RULES CRUD ----
app.get('/api/rules', (req, res) => {
  res.json(readJSON(RULES_FILE));
});

app.post('/api/rules', (req, res) => {
  const rules = readJSON(RULES_FILE);
  const rule = { id: genId(), ...req.body, active: req.body.active !== false };
  rules.push(rule);
  writeJSON(RULES_FILE, rules);
  res.status(201).json(rule);
});

app.put('/api/rules/:id', (req, res) => {
  const rules = readJSON(RULES_FILE);
  const idx = rules.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  rules[idx] = { ...rules[idx], ...req.body, id: req.params.id };
  writeJSON(RULES_FILE, rules);
  res.json(rules[idx]);
});

app.delete('/api/rules/:id', (req, res) => {
  let rules = readJSON(RULES_FILE);
  const len = rules.length;
  rules = rules.filter(r => r.id !== req.params.id);
  if (rules.length === len) return res.status(404).json({ error: 'Rule not found' });
  writeJSON(RULES_FILE, rules);
  res.json({ success: true });
});

// ---- EXTRACT RULES (OpenAI) ----
app.post('/api/extract', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No policy text provided' });

  if (!OPENAI_KEY) {
    // Fallback: simple heuristic extraction
    const lines = text.split(/\n/).filter(l => l.trim());
    const rules = [];
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('must') || lower.includes('shall') || lower.includes('require') || lower.includes('if') || lower.includes('يجب') || lower.includes('إذا')) {
        rules.push({
          id: genId(),
          name: line.slice(0, 60).trim(),
          condition: line.trim(),
          action: lower.includes('reject') || lower.includes('رفض') ? 'REJECTED' : lower.includes('review') || lower.includes('مراجعة') ? 'REVIEW' : 'APPROVED',
          reason: line.trim(),
          priority: 1,
          active: true
        });
      }
    }
    if (rules.length === 0) {
      // Just create one rule per meaningful line
      for (const line of lines.slice(0, 10)) {
        if (line.trim().length > 10) {
          rules.push({
            id: genId(),
            name: line.slice(0, 60).trim(),
            condition: line.trim(),
            action: 'REVIEW',
            reason: line.trim(),
            priority: 1,
            active: true
          });
        }
      }
    }
    return res.json({ rules, source: 'heuristic' });
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a legal rules extraction engine. Given policy text, extract structured rules. Return JSON array of objects with fields: name, condition (IF statement), action (APPROVED/REJECTED/REVIEW), reason, priority (1-3). Return ONLY valid JSON array.' },
          { role: 'user', content: text }
        ],
        temperature: 0.2
      })
    });
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    let extracted = JSON.parse(cleaned);
    extracted = extracted.map(r => ({ id: genId(), ...r, active: true }));
    res.json({ rules: extracted, source: 'openai' });
  } catch (err) {
    res.status(500).json({ error: 'Extraction failed: ' + err.message });
  }
});

// ---- DECIDE ----
app.post('/api/decide', (req, res) => {
  const { facts } = req.body;
  if (!facts || typeof facts !== 'object') return res.status(400).json({ error: 'Provide facts object' });

  const rules = readJSON(RULES_FILE).filter(r => r.active);
  rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  let matched = null;
  for (const rule of rules) {
    try {
      // Build evaluation context
      const keys = Object.keys(facts);
      const vals = Object.values(facts);
      const fn = new Function(...keys, `return (${rule.condition})`);
      const result = fn(...vals);
      if (result) { matched = rule; break; }
    } catch {
      // condition didn't match or invalid expression
    }
  }

  const decision = {
    id: 'd-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    facts,
    decision: matched ? matched.action : 'REVIEW',
    matchedRule: matched ? matched.id : null,
    ruleName: matched ? matched.name : 'No matching rule',
    reason: matched ? matched.reason : 'No active rule matched — flagged for manual review'
  };

  const decisions = readJSON(DECISIONS_FILE);
  decisions.push(decision);
  writeJSON(DECISIONS_FILE, decisions);
  res.json(decision);
});

// ---- DECISIONS LOG ----
app.get('/api/decisions', (req, res) => {
  res.json(readJSON(DECISIONS_FILE));
});

// ---- CONFLICTS ----
app.get('/api/conflicts', (req, res) => {
  const rules = readJSON(RULES_FILE).filter(r => r.active);
  const conflicts = [];
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i], b = rules[j];
      // Same condition different action
      if (a.condition.trim().toLowerCase() === b.condition.trim().toLowerCase() && a.action !== b.action) {
        conflicts.push({
          type: 'contradictory',
          rules: [a.id, b.id],
          ruleNames: [a.name, b.name],
          explanation: `Rules "${a.name}" and "${b.name}" have the same condition but different actions (${a.action} vs ${b.action})`,
          suggestion: 'Remove or deactivate one of the conflicting rules, or adjust priorities.'
        });
      }
      // Same condition same action (duplicate)
      if (a.condition.trim().toLowerCase() === b.condition.trim().toLowerCase() && a.action === b.action) {
        conflicts.push({
          type: 'duplicate',
          rules: [a.id, b.id],
          ruleNames: [a.name, b.name],
          explanation: `Rules "${a.name}" and "${b.name}" appear to be duplicates`,
          suggestion: 'Remove the duplicate rule.'
        });
      }
    }
  }
  res.json(conflicts);
});

// ---- DEMO LOAD ----
app.post('/api/demo/load', (req, res) => {
  const demo = JSON.parse(fs.readFileSync(DEMO_FILE, 'utf8'));
  writeJSON(RULES_FILE, demo.rules);
  writeJSON(DECISIONS_FILE, demo.decisions);
  res.json({ success: true, rulesLoaded: demo.rules.length, decisionsLoaded: demo.decisions.length });
});

app.post('/api/demo/reset', (req, res) => {
  writeJSON(RULES_FILE, []);
  writeJSON(DECISIONS_FILE, []);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`⚖️ Mizan Rules Engine running on http://localhost:${PORT}`);
});

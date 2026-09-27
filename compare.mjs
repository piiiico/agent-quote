#!/usr/bin/env node
// Rank agent-quote QUOTEs against one RFQ. No dependencies.  Usage: node compare.mjs rfq.json quote1.json [quote2.json ...]
// The buyer checks every requirement against the seller's CLAIMS. A claim with no evidence counts as unverified, never as met.
import { readFileSync } from 'node:fs';
const [rfq, ...quotes] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
if (!rfq || !quotes.length) { console.error('usage: node compare.mjs rfq.json quote.json [...]'); process.exit(2); }
const list = (x) => [].concat(x);
const ops = { eq: (c, v) => JSON.stringify(c) === JSON.stringify(v), gte: (c, v) => c >= v, lte: (c, v) => c <= v,
  includes: (c, v) => list(c).includes(v), any_of: (c, v) => v.some((x) => list(c).includes(x)) };
const DAY = 864e5, years = rfq.horizon_years ?? 5, decideBy = Date.parse(rfq.reply_by);
const mult = { one_time: 1, per_year: years, per_month: 12 * years };
const rows = quotes.map((q) => {
  const hard = [], soft = [];
  if (q.rfq_id !== rfq.id) hard.push(`answers ${q.rfq_id}, not ${rfq.id}`);
  if (q.currency !== rfq.currency) hard.push(`currency ${q.currency} != ${rfq.currency}`);
  if (Date.parse(q.valid_until) < decideBy) hard.push(`expires ${q.valid_until}, before reply_by`);
  if (rfq.delivery_by && decideBy + q.lead_time_days * DAY > Date.parse(rfq.delivery_by)) hard.push(`lead time ${q.lead_time_days}d misses ${rfq.delivery_by}`);
  const validDays = Math.round((Date.parse(q.valid_until) - Date.parse(q.issued_at)) / DAY);
  if (rfq.validity_wanted_days && validDays < rfq.validity_wanted_days) soft.push(`valid ${validDays}d < ${rfq.validity_wanted_days}d wanted`);
  if (!q.binding) soft.push('indicative, not binding');
  const req = rfq.requirements.map((r) => {
    const c = q.claims.find((c) => c.key === r.key);
    return { ...r, s: !c ? 'unanswered' : !ops[r.op](c.value, r.value) ? 'unmet' : c.evidence.length ? 'met' : 'unverified' };
  });
  for (const r of req) if (r.s !== 'met') (r.level === 'must' && r.s !== 'unverified' ? hard : soft).push(`${r.level} ${r.id} ${r.key} ${r.op} ${JSON.stringify(r.value)}: ${r.s}`);
  const tco = q.price.reduce((t, p) => t + (p.kind === 'share' ? 0 : p.amount * (p.qty ?? 1) * mult[p.kind]), 0);
  const unpriced = q.price.filter((p) => p.kind === 'share').map((p) => `${p.pct}% of ${p.of}`);
  const facts = q.price.length + q.includes.length + q.excludes.length + q.claims.length + Object.keys(q.conditions ?? {}).length + 3; // +lead time, validity, binding
  const evidenced = q.claims.filter((c) => c.evidence.length).length;
  return { q, hard, soft, tco, unpriced, facts, evidenced, mustUnverified: req.filter((r) => r.level === 'must' && r.s === 'unverified').length };
});
// Buyer policy, one line: disqualified last, then fewest unverified musts, then lowest cost over the horizon.
rows.sort((a, b) => a.hard.length - b.hard.length || a.mustUnverified - b.mustUnverified || a.tco - b.tco);
rows.forEach((r, i) => {
  console.log(`#${i + 1} ${r.q.seller.name}  quote ${r.q.id}  ${r.hard.length ? 'DISQUALIFIED' : 'qualified'}`);
  console.log(`   ${years}-year cost ${r.tco.toLocaleString('en-US')} ${r.q.currency} ex VAT${r.unpriced.length ? ' + ' + r.unpriced.join(', ') : ''}`);
  console.log(`   facts ${r.facts}, claims with evidence ${r.evidenced}/${r.q.claims.length}, excludes: ${r.q.excludes.join('; ') || 'none'}`);
  for (const h of r.hard) console.log(`   x ${h}`);
  for (const s of r.soft) console.log(`   ! ${s}`);
});

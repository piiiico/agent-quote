// Validates the examples against the schemas, then checks that compare.mjs ranks and disqualifies for the right reasons.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const load = (f) => JSON.parse(readFileSync(f, 'utf8'));
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
for (const s of ['rfq', 'quote', 'well-known']) ajv.addSchema(load(`schema/${s}.schema.json`), `${s}.schema.json`);
const valid = (schema, doc) => ajv.validate(schema, doc);
let fails = 0, passes = 0;
const check = (name, ok) => { ok ? passes++ : fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`); };

const ex = 'examples/ems-bess';
const rfq = load(`${ex}/rfq.json`), a = load(`${ex}/quote-a.json`), b = load(`${ex}/quote-b.json`);
check('rfq.json validates', valid('rfq.schema.json', rfq));
check('quote-a.json validates', valid('quote.schema.json', a));
check('quote-b.json validates', valid('quote.schema.json', b));
check('well-known-quote.json validates', valid('well-known.schema.json', load(`${ex}/well-known-quote.json`)));
// Negative arms: the schema must refuse what the format exists to prevent.
check('seller self-grading ("answers") is rejected', !valid('quote.schema.json', { ...a, answers: [{ requirement: 'r1', status: 'met' }] }));
check('a prose field in a quote is rejected', !valid('quote.schema.json', { ...a, message: 'We are thrilled to...' }));
check('a share line without pct is rejected', !valid('quote.schema.json', { ...a, price: [{ id: 'x', item: 'fee', kind: 'share', of: 'revenue' }] }));
check('a price line without amount is rejected', !valid('quote.schema.json', { ...a, price: [{ id: 'x', item: 'licence', kind: 'per_year' }] }));
check('an rfq without requirements is rejected', !valid('rfq.schema.json', (({ requirements, ...r }) => r)(rfq)));

const dir = mkdtempSync(join(tmpdir(), 'aq-'));
const run = (...docs) => execFileSync('node', ['compare.mjs', ...docs.map((d, i) => { const f = join(dir, `${i}.json`); writeFileSync(f, JSON.stringify(d)); return f; })], { encoding: 'utf8' });
const first = (out) => out.split('\n')[0];

const base = run(rfq, a, b);
check('demo: Fjordstyring ranks first (Kilowise has an unverified must)', first(base).includes('Fjordstyring'));
check('demo: 5-year cost A = 70,400', base.includes('5-year cost 70,400 NOK'));
check('demo: 5-year cost B = 41,400', base.includes('5-year cost 41,400 NOK'));
const bEvidenced = structuredClone(b);
bEvidenced.claims.find((c) => c.key === 'fallback.on_cloud_loss').evidence = [{ type: 'test_report', url: 'https://example.com/kilowise/failover' }];
check('evidence for the fallback claim flips the ranking to the cheaper quote', first(run(rfq, a, bEvidenced)).includes('Kilowise'));
const aNoModbus = structuredClone(a);
aNoModbus.claims = aNoModbus.claims.filter((c) => c.key !== 'integration.protocols');
const out = run(rfq, aNoModbus, b);
check('a missing must-claim disqualifies and ranks last', out.includes('Fjordstyring AS (fictional)  quote fs-q-4471  DISQUALIFIED') && first(out).includes('Kilowise'));
const aWrongValue = structuredClone(a);
aWrongValue.claims.find((c) => c.key === 'integration.protocols').value = ['modbus-rtu'];
check('a must-claim with the wrong value is "unmet", evidence or not', run(rfq, aWrongValue).includes('r1 integration.protocols includes "modbus-tcp": unmet'));
check('a quote for another RFQ is disqualified', run(rfq, { ...a, rfq_id: 'other' }).includes('DISQUALIFIED'));
check('a lead time past delivery_by is disqualified', run(rfq, { ...a, lead_time_days: 200 }).includes('misses 2027-01-15'));

console.log(`\n${passes} passed, ${fails} failed`);
if (passes < 17) { console.log('expected 17 checks'); process.exit(1); }
process.exit(fails ? 1 : 0);

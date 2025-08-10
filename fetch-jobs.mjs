// fetch-jobs.mjs
// Pull finance roles from public Greenhouse + Lever boards and write jobs.json
// Runs hourly via GitHub Actions (Node 20 with global fetch)

import { writeFileSync } from 'fs';

// --- Config ---
const GREENHOUSE_COMPANIES = [
  'doordash', 'stripe', 'snowflake', 'chime', 'airbnb', 'datadog', 'asana', 'etsy', 'affirm'
];
const LEVER_COMPANIES = [
  'notion', 'benchling', 'robinhood', 'reddit', 'brex', 'dropbox'
];

// Titles to include
const FINANCE_KEYWORDS = [
  'financial analyst', 'fp&a', 'fp&a analyst', 'finance analyst',
  'strategic finance', 'corporate finance', 'revenue analyst',
  'finance data analyst', 'treasury analyst', 'valuation', 'valuations'
].map(s => s.toLowerCase());

// Exclude defense contractors/terms
const EXCLUDE_TERMS = [
  'defense', 'raytheon', 'lockheed', 'northrop', 'general dynamics',
  'bae systems', 'boeing defense'
].map(s => s.toLowerCase());

// Only keep jobs posted in the last N days
const MAX_AGE_DAYS = 10;

// ---- Helpers ----
const daysAgo = (d) => {
  if (!d) return 9999;
  const when = new Date(d);
  const ms = Date.now() - when.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

const looksFinance = (title) => {
  const t = (title || '').toLowerCase();
  return FINANCE_KEYWORDS.some(k => t.includes(k));
};

const notDefense = (company, title) => {
  const s = `${company || ''} ${title || ''}`.toLowerCase();
  return !EXCLUDE_TERMS.some(k => s.includes(k));
};

const isUS = (location) => {
  if (!location) return false;
  const s = location.toLowerCase();
  // quick/loose checks for US
  return ['united states', 'us', 'usa', 'remote (us)', 'remote-us', 'remote us'].some(x => s.includes(x))
      || s.match(/\b(AL|AK|AZ|AR|CA|CO|CT|DC|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV)\b/i)
      || s.match(/\b(New York|Boston|Austin|San Francisco|Seattle|Chicago|Dallas|Atlanta|Los Angeles|Denver)\b/i);
};

function normSalary(s) {
  // Many postings won’t have salary; keep as "—"
  if (!s) return '—';
  return s;
}

function makeTags(job) {
  const tags = [];
  const t = (job.title || '').toLowerCase();
  if (t.includes('junior') || t.includes('associate')) tags.push('Early-career');
  if (t.includes('remote')) tags.push('Remote');
  if (t.includes('hybrid')) tags.push('Hybrid');
  return tags;
}

// ---- Greenhouse fetcher ----
// API: https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true
async function fetchGreenhouse(company) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GH ${company} HTTP ${res.status}`);
    const data = await res.json();
    const jobs = (data.jobs || []).map(j => {
      const loc = j.location?.name || '';
      const updated = j.updated_at || j.created_at;
      return {
        source: 'greenhouse',
        company: j.company?.name || company,
        title: j.title,
        location: loc,
        posted_days: daysAgo(updated),
        salary: normSalary(null), // salary usually not provided
        tags: makeTags(j),
        url: j.absolute_url
      };
    });
    return jobs;
  } catch (e) {
    console.warn(`Greenhouse fetch failed for ${company}:`, e.message);
    return [];
  }
}

// ---- Lever fetcher ----
// API: https://api.lever.co/v0/postings/{company}?mode=json
async function fetchLever(company) {
  const url = `https://api.lever.co/v0/postings/${company}?mode=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Lever ${company} HTTP ${res.status}`);
    const data = await res.json();
    const jobs = (data || []).map(j => {
      const loc = j.categories?.location || j.additional?.location || '';
      // createdAt is ms since epoch
      const updatedISO = j.createdAt ? new Date(j.createdAt).toISOString() : null;
      return {
        source: 'lever',
        company: j.categories?.team || company, // Lever often lacks company; use team as proxy
        title: j.text || j.title,
        location: loc,
        posted_days: daysAgo(updatedISO),
        salary: normSalary(j.salary),
        tags: makeTags(j),
        url: j.hostedUrl || j.applyUrl || j.url
      };
    });
    return jobs;
  } catch (e) {
    console.warn(`Lever fetch failed for ${company}:`, e.message);
    return [];
  }
}

// ---- Main runner ----
async function main() {
  const ghLists = await Promise.all(GREENHOUSE_COMPANIES.map(fetchGreenhouse));
  const leverLists = await Promise.all(LEVER_COMPANIES.map(fetchLever));

  let combined = [...ghLists.flat(), ...leverLists.flat()];

  // Basic filters
  combined = combined.filter(j =>
    j.title && looksFinance(j.title) &&
    notDefense(j.company, j.title) &&
    j.location && isUS(j.location) &&
    (typeof j.posted_days === 'number' ? j.posted_days <= MAX_AGE_DAYS : true) &&
    j.url
  );

  // Normalize company if missing
  combined = combined.map(j => ({
    title: j.title,
    company: j.company || 'Company',
    location: j.location || 'United States',
    posted_days: typeof j.posted_days === 'number' ? j.posted_days : '—',
    salary: j.salary || '—',
    tags: j.tags || [],
    url: j.url
  }));

  // Deduplicate by URL
  const seen = new Set();
  const deduped = [];
  for (const j of combined) {
    if (seen.has(j.url)) continue;
    seen.add(j.url);
    deduped.push(j);
  }

  // Sort by freshest first
  deduped.sort((a,b) => (a.posted_days ?? 999) - (b.posted_days ?? 999));

  // Cap to ~100 to keep payload light
  const final = deduped.slice(0, 100);

  writeFileSync('jobs.json', JSON.stringify(final, null, 2));
  console.log(`Wrote ${final.length} jobs to jobs.json`);
}

main().catch(err => {
  console.error('Job fetch failed:', err);
  process.exitCode = 1;
});

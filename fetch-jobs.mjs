// fetch-jobs.mjs — pulls real postings from Greenhouse + Lever (Node 20+)

import { writeFileSync } from 'fs';

// --------- Tunables ----------
const GREENHOUSE = [
  'visa', 'stripe', 'snowflake', 'chime', 'airbnb', 'datadog', 'asana', 'etsy', 'affirm', 'doordash'
];
const LEVER = [
  // slug : Pretty Name
  ['notion', 'Notion'],
  ['benchling', 'Benchling'],
  ['robinhood', 'Robinhood'],
  ['reddit', 'Reddit'],
  ['brex', 'Brex'],
  ['dropbox', 'Dropbox']
];

const MAX_AGE_DAYS = 10;
const FINANCE_KEYWORDS = [
  'financial analyst', 'fp&a', 'fp & a', 'finance analyst', 'strategic finance',
  'corporate finance', 'revenue analyst', 'finance data analyst', 'treasury analyst',
  'valuation', 'valuations', 'financial planning', 'fpna'
].map(s => s.toLowerCase());
const EXCLUDE_TERMS = ['defense','raytheon','lockheed','northrop','general dynamics','bae systems','boeing'].map(s=>s.toLowerCase());

// ---------- Helpers ----------
const daysAgo = (iso) => {
  if (!iso) return 9999;
  const d = new Date(iso);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
};
const looksFinance = (title='') => FINANCE_KEYWORDS.some(k => title.toLowerCase().includes(k));
const notDefense = (company='', title='') => !EXCLUDE_TERMS.some(k => (company+' '+title).toLowerCase().includes(k));
const isUS = (loc='') => {
  const s = loc.toLowerCase();
  if (!s) return false;
  return ['united states','us','usa','remote (us)','remote-us','remote us'].some(x=>s.includes(x))
    || /\b(AL|AK|AZ|AR|CA|CO|CT|DC|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV)\b/i.test(s)
    || /\b(New York|Boston|Austin|San Francisco|Seattle|Chicago|Dallas|Atlanta|Los Angeles|Denver|Remote)\b/i.test(s);
};
const mkTags = (title='', loc='') => {
  const t = [];
  const tl = title.toLowerCase(), ll = loc.toLowerCase();
  if (tl.includes('junior') || tl.includes('associate')) t.push('Early-career');
  if (ll.includes('remote')) t.push('Remote');
  if (ll.includes('hybrid')) t.push('Hybrid');
  if (ll.includes('onsite') || ll.includes('on-site')) t.push('Onsite');
  return t;
};

// ---------- Greenhouse ----------
async function fetchGreenhouse(boardSlug){
  const url = `https://boards-api.greenhouse.io/v1/boards/${boardSlug}/jobs?content=true`;
  try{
    const res = await fetch(url);
    if(!res.ok) throw new Error(`GH ${boardSlug} ${res.status}`);
    const data = await res.json();
    return (data.jobs||[]).map(j => {
      const loc = j.location?.name || '';
      const updated = j.updated_at || j.created_at;
      return {
        title: j.title,
        company: j.company?.name || capitalize(boardSlug),
        location: loc,
        posted_days: daysAgo(updated),
        salary: '—',
        tags: mkTags(j.title, loc),
        url: j.absolute_url
      };
    });
  }catch(e){
    console.warn('Greenhouse error', boardSlug, e.message);
    return [];
  }
}

// ---------- Lever ----------
async function fetchLever(boardSlug, prettyName){
  const url = `https://api.lever.co/v0/postings/${boardSlug}?mode=json`;
  try{
    const res = await fetch(url);
    if(!res.ok) throw new Error(`Lever ${boardSlug} ${res.status}`);
    const data = await res.json();
    return (data||[]).map(j => {
      const loc = j.categories?.location || j.additional?.location || '';
      const createdISO = j.createdAt ? new Date(j.createdAt).toISOString() : null;
      return {
        title: j.text || j.title,
        company: prettyName || capitalize(boardSlug),
        location: loc,
        posted_days: daysAgo(createdISO),
        salary: j.salary || '—',
        tags: mkTags(j.text || j.title, loc),
        url: j.hostedUrl || j.applyUrl || j.url
      };
    });
  }catch(e){
    console.warn('Lever error', boardSlug, e.message);
    return [];
  }
}

const capitalize = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// ---------- Main ----------
async function main(){
  const ghLists = await Promise.all(GREENHOUSE.map(fetchGreenhouse));
  const lvLists = await Promise.all(LEVER.map(([slug,name]) => fetchLever(slug, name)));
  let jobs = [...ghLists.flat(), ...lvLists.flat()];

  jobs = jobs.filter(j =>
    j.title && looksFinance(j.title) &&
    j.location && isUS(j.location) &&
    notDefense(j.company, j.title) &&
    j.url && (typeof j.posted_days !== 'number' || j.posted_days <= MAX_AGE_DAYS)
  );

  // Dedupe by URL
  const seen = new Set();
  jobs = jobs.filter(j => (seen.has(j.url) ? false : seen.add(j.url)));

  // Sort freshest first and cap
  jobs.sort((a,b) => (a.posted_days ?? 999) - (b.posted_days ?? 999));
  jobs = jobs.slice(0, 120);

  writeFileSync('jobs.json', JSON.stringify(jobs, null, 2));
  console.log(`Wrote ${jobs.length} jobs to jobs.json`);
}
main().catch(err => { console.error(err); process.exit(1); });

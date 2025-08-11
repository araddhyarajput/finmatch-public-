// scripts/fetch_jobs.mjs
// Node 20+ (native fetch). Writes jobs.json at repo root.

import { writeFile } from "node:fs/promises";

const DAYS = 10;
const SALARY_HINT = ""; // leave blank (API rarely has it); your site shows "—" if empty
const NOW = new Date();

function daysAgo(dateStr) {
  const d = new Date(dateStr);
  const ms = NOW - d;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// --- Fetch Remotive (remote-only, but good signal)
async function fetchRemotive() {
  const url = "https://remotive.com/api/remote-jobs?search=finance%20analyst,fp%26a,corporate%20finance,strategic%20finance";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Remotive HTTP " + res.status);
  const data = await res.json();
  const items = (data.jobs || []).map(j => ({
    source: "remotive",
    id: `remotive_${j.id}`,
    title: j.title || "",
    company: j.company_name || "",
    location: j.candidate_required_location || j.job_type || "Remote",
    posted_at: j.publication_date || j.created_at || NOW.toISOString(),
    url: j.url || j.job_url || "",
    tags: Array.from(new Set([...(j.tags || []), "Remote"])),
  }));
  return items;
}

// --- Fetch The Muse (US-centric; finance category)
async function fetchMuse(page = 1) {
  const url = `https://www.themuse.com/api/public/jobs?page=${page}&category=Accounting%20and%20Finance`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Muse HTTP " + res.status);
  const data = await res.json();
  const items = (data.results || []).map(j => {
    const loc = (j.locations && j.locations[0] && j.locations[0].name) || "";
    return {
      source: "muse",
      id: `muse_${j.id}`,
      title: j.name || "",
      company: (j.company && j.company.name) || "",
      location: loc || "United States",
      posted_at: j.publication_date || NOW.toISOString(),
      url: j.refs && j.refs.landing_page ? j.refs.landing_page : "",
      tags: (j.categories || []).map(c => c.name).concat(["Muse"]),
    };
  });
  return { items, total: data.page_count || 1 };
}

function normalize(items) {
  // Filter to US/Remote and early-career-ish roles; last 10 days
  const earlyWords = /(junior|entry|associate|analyst|financial analyst|fp&a|strategic finance|corporate finance)/i;
  const usLike = /(United States|USA|US|Remote|NY|CA|TX|MA|WA|IL|FL|CO|NC|GA|PA|AZ|OH|MI|VA|NJ|MD|DC|OR|MN|MO|TN|UT|IN|MA|Boston|New York|Austin|Seattle|Chicago|SF|San Francisco|Los Angeles)/i;

  const cleaned = items
    .filter(j => j.title && j.company && j.url)
    .filter(j => daysAgo(j.posted_at) <= DAYS)
    .filter(j => earlyWords.test(j.title))
    .filter(j => usLike.test(j.location) || /Remote/i.test(j.location))
    .map(j => ({
      title: j.title.trim(),
      company: j.company.trim(),
      location: j.location.trim(),
      posted_days: daysAgo(j.posted_at),
      salary: SALARY_HINT || null,
      url: j.url,
      tags: (j.tags || []).slice(0, 6),
    }));

  // De-dupe by title+company
  const seen = new Set();
  const deduped = [];
  for (const j of cleaned) {
    const key = (j.title + "@" + j.company).toLowerCase();
    if (!seen.has(key)) { seen.add(key); deduped.push(j); }
  }
  // Sort by most recent
  deduped.sort((a,b) => (a.posted_days ?? 999) - (b.posted_days ?? 999));
  return deduped.slice(0, 40); // cap list
}

async function main() {
  try {
    const [remotive, musePage1] = await Promise.all([
      fetchRemotive().catch(() => []),
      fetchMuse(1).catch(() => ({ items: [], total: 1 })),
    ]);

    // Optionally fetch more Muse pages (light)
    const moreMuse = [];
    for (let p = 2; p <= 3; p++) {
      try {
        const r = await fetchMuse(p);
        moreMuse.push(...r.items);
      } catch {}
    }

    const all = [...remotive, ...musePage1.items, ...moreMuse];
    const jobs = normalize(all);

    await writeFile("jobs.json", JSON.stringify(jobs, null, 2));
    console.log(`Wrote jobs.json with ${jobs.length} jobs`);
  } catch (e) {
    console.error("Failed to build jobs.json:", e);
    // Write a minimal fallback so site doesn't break
    const fallback = [{
      title: "Financial Analyst (Example)",
      company: "Example Co.",
      location: "Remote, US",
      posted_days: 1,
      salary: null,
      url: "https://example.com",
      tags: ["Finance","FP&A"]
    }];
    await writeFile("jobs.json", JSON.stringify(fallback, null, 2));
    process.exitCode = 0; // don't fail the workflow
  }
}

await main();

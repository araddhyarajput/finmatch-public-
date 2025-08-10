# scripts/generate_jobs.py
import json, time, random

# TODO: Replace this with real fetchers (e.g., Greenhouse/Lever boards)
seed = [
    {
        "title": "Financial Analyst — FP&A",
        "company": "Visa",
        "location": "Austin, TX (Hybrid)",
        "salary": "$78–88k",
        "tags": ["Excel","Power BI","Forecasting","Early-career"],
        "url": "https://jobs.greenhouse.io/"
    },
    {
        "title": "Strategic Finance Analyst",
        "company": "Chime",
        "location": "Remote (US)",
        "salary": "$82–95k",
        "tags": ["SQL","Dashboarding","SaaS"],
        "url": "https://jobs.lever.co/"
    },
    {
        "title": "Corporate Finance Analyst",
        "company": "S&P Global",
        "location": "New York, NY (Hybrid)",
        "salary": "$70–82k",
        "tags": ["Valuation","Budgeting","Stakeholders"],
        "url": "https://careers.spglobal.com/"
    }
]

# Pretend freshness by rotating posted days 0–6
jobs = []
for j in seed:
    jj = j.copy()
    jj["posted_days"] = random.randint(0, 6)
    jobs.append(jj)

with open("jobs.json", "w", encoding="utf-8") as f:
    json.dump(jobs, f, indent=2, ensure_ascii=False)

print(f"Updated jobs.json with {len(jobs)} jobs at {time.ctime()}")

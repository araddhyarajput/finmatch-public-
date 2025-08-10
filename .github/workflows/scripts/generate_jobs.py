import json, random, datetime

companies = ["Acme Corp", "Bright Capital", "NextGen Tech", "Future Finance", "Growth Partners"]
roles = ["Financial Analyst", "FP&A Analyst", "Corporate Finance Associate", "Valuations Analyst", "Strategic Finance Associate"]
locations = ["New York, NY", "Remote", "Boston, MA", "Chicago, IL", "San Francisco, CA"]
tags_list = [
    ["FP&A", "Excel", "Forecasting", "Budgeting"],
    ["Valuations", "Financial Modeling", "M&A", "Presentation Skills"],
    ["SQL", "Data Analysis", "Scenario Planning", "Power BI"]
]

jobs = []
for _ in range(5):
    jobs.append({
        "title": random.choice(roles),
        "company": random.choice(companies),
        "location": random.choice(locations),
        "posted_days": random.randint(0, 7),
        "salary": f"${random.randint(70, 85)}k–${random.randint(85, 95)}k",
        "tags": random.choice(tags_list),
        "url": "https://example.com/job" + str(random.randint(1,100))
    })

with open("jobs.json", "w") as f:
    json.dump(jobs, f, indent=2)

print(f"Updated jobs.json with {len(jobs)} jobs on {datetime.datetime.now()}")

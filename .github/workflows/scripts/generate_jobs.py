import json, random, datetime

# Seed data for now; replace with real fetchers later
seed = [
  {"title":"Financial Analyst - FP&A","company":"Visa","location":"Austin, TX (Hybrid)","salary":"$78k–$88k","tags":["Excel","Power BI","Forecasting","Early-career"],"url":"https://jobs.greenhouse.io/"},
  {"title":"Strategic Finance Analyst","company":"Chime","location":"Remote (US)","salary":"$82k–$95k","tags":["SQL","Dashboarding","SaaS"],"url":"https://jobs.lever.co/"},
  {"title":"Corporate Finance Analyst","company":"S&P Global","location":"New York, NY (Hybrid)","salary":"$70k–$82k","tags":["Valuation","Budgeting","Stakeholders"],"url":"https://careers.spglobal.com/"},
  {"title":"Valuations Analyst","company":"Duff & Phelps","location":"Chicago, IL (Onsite)","salary":"$75k–$90k","tags":["DCF","WACC","Excel"],"url":"https://careers.kroll.com/"},
  {"title":"Revenue Analyst","company":"Snowflake","location":"Remote (US)","salary":"$80k–$95k","tags":["SQL","SaaS Metrics","Tableau"],"url":"https://careers.snowflake.com/"},
  {"title":"Finance Data Analyst","company":"Wayfair","location":"Boston, MA (Hybrid)","salary":"$72k–$85k","tags":["Python","Power BI","Variance Analysis"],"url":"https://www.aboutwayfair.com/careers"},
  {"title":"Strategy & Operations Analyst","company":"DoorDash","location":"San Francisco, CA (Hybrid)","salary":"$85k–$100k","tags":["Modeling","KPI","Stakeholders"],"url":"https://careers.doordash.com/"},
  {"title":"Junior FP&A Analyst","company":"ServiceNow","location":"Dallas, TX (Onsite)","salary":"$70k–$80k","tags":["Budgeting","Forecasting","Excel"],"url":"https://careers.servicenow.com/"}
]

# Simulate freshness each run
jobs = []
for j in seed:
    k = dict(j)
    k["posted_days"] = random.randint(0, 6)
    jobs.append(k)

with open("jobs.json", "w", encoding="utf-8") as f:
    json.dump(jobs, f, indent=2, ensure_ascii=False)

print(f"Updated jobs.json with {len(jobs)} jobs at {datetime.datetime.now()}")

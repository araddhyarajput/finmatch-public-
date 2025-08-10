import json, random, datetime
seed = [
  {"title":"Financial Analyst — FP&A","company":"Acme Corp","location":"New York, NY","salary":"$75k–$85k","tags":["FP&A","Excel","Forecasting","Budgeting"],"url":"https://example.com/job1"},
  {"title":"Strategic Finance Analyst","company":"Bright Capital","location":"Remote (US)","salary":"$82k–$95k","tags":["SQL","Power BI","Scenario Planning"],"url":"https://example.com/job2"},
  {"title":"Corporate Finance Analyst","company":"NextGen Tech","location":"Boston, MA","salary":"$70k–$80k","tags":["Valuation","Modeling","Stakeholders"],"url":"https://example.com/job3"}
]
for j in seed: j["posted_days"] = random.randint(0,6)
with open("jobs.json","w") as f: json.dump(seed, f, indent=2)
print("Updated jobs.json", datetime.datetime.now())

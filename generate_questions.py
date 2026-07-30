import json
import random

categories = [
    "Constitutional Law",
    "Criminal Law",
    "Civil Law",
    "Evidence Law",
    "Court Procedures",
    "Case Law",
    "Judicial Ethics",
    "Legal Reasoning",
    "Statutory Interpretation",
    "Other judicial topics"
]

questions = []

for i in range(1, 1001):
    category = random.choice(categories)
    q = {
        "question_text": f"Sample Legal Question {i} regarding {category} principles. How should this be interpreted?",
        "existing_answer": f"The standard legal interpretation for this scenario in {category} dictates that precedent must be followed, unless exceptional circumstances apply as outlined in section {random.randint(1,99)}.",
        "category": category,
        "status": "available"
    }
    questions.append(q)

with open('questions.json', 'w') as f:
    json.dump(questions, f, indent=2)

print(f"Generated 1000 legal questions in questions.json")

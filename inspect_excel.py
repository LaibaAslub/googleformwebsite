import pandas as pd
import json

df = pd.read_excel("100_Unique_Law_Questions_Answers.xlsx")
print(json.dumps({"columns": list(df.columns), "first_row": df.iloc[0].to_dict()}))

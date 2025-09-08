import sys
import os
sys.path.append('.')
from services import get_engine
import pandas as pd
from sqlalchemy import text

print("=== Debugging Date Issue ===")

# Test 1: Check what type of data is in reg_date field
engine = get_engine()
print("1. Checking reg_date field values and types...")

# Simple query to check some dates
df_sample = pd.read_sql(text("""
    SELECT reg_date, month_year, COUNT(*) as count
    FROM analytics.product_icegate_imports 
    WHERE true_importer_name = 'KLJ RESOURCES LTD'
    GROUP BY reg_date, month_year
    ORDER BY reg_date DESC
    LIMIT 20
"""), engine)

print(f"Sample dates from database:")
for _, row in df_sample.iterrows():
    print(f"  {row['reg_date']} ({type(row['reg_date'])})")

print("\n2. Testing date comparison directly...")
# Test date comparison
test_query = text("""
    SELECT COUNT(*) as count
    FROM analytics.product_icegate_imports 
    WHERE true_importer_name = 'KLJ RESOURCES LTD'
    AND reg_date > :end_date
""")

result = pd.read_sql(test_query, engine, params={'end_date': '2025-03-31'})
print(f"Records with reg_date > '2025-03-31': {result.iloc[0]['count']}")

print("\n3. Testing with CAST...")
# Test with explicit CAST
test_query2 = text("""
    SELECT COUNT(*) as count
    FROM analytics.product_icegate_imports 
    WHERE true_importer_name = 'KLJ RESOURCES LTD'
    AND reg_date > CAST(:end_date AS DATE)
""")

result2 = pd.read_sql(test_query2, engine, params={'end_date': '2025-03-31'})
print(f"Records with reg_date > CAST('2025-03-31' AS DATE): {result2.iloc[0]['count']}")

print("\n4. Direct SQL test with literal dates...")
test_query3 = text("""
    SELECT COUNT(*) as count
    FROM analytics.product_icegate_imports 
    WHERE true_importer_name = 'KLJ RESOURCES LTD'
    AND reg_date > '2025-03-31'
""")

result3 = pd.read_sql(test_query3, engine)
print(f"Records with reg_date > '2025-03-31' (literal): {result3.iloc[0]['count']}")

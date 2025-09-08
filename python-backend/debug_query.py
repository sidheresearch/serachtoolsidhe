import sys
import os
sys.path.append('.')
from services import get_engine
import pandas as pd
from sqlalchemy import text

print("=== Testing Exact Query ===")

engine = get_engine()

# Test the exact query that should be running
test_query = text("""
    SELECT system_id, reg_date, month_year, true_importer_name
    FROM analytics.product_icegate_imports 
    WHERE true_importer_name IN (:imp_param_0) 
    OR true_supplier_name IN (:sup_param_0)
    AND reg_date >= :filter_param_2 AND reg_date <= :filter_param_3
    ORDER BY reg_date DESC
    LIMIT 10
""")

params = {
    'imp_param_0': 'KLJ RESOURCES LTD', 
    'sup_param_0': 'KLJ RESOURCES LTD', 
    'filter_param_2': '2024-04-01', 
    'filter_param_3': '2025-03-31'
}

print("Query:")
print(test_query)
print(f"Params: {params}")

df = pd.read_sql(test_query, engine, params=params)
print(f"\nResults ({len(df)} rows):")
for _, row in df.iterrows():
    print(f"  {row['reg_date']} - {row['true_importer_name']}")

print("\n=== Testing with parentheses ===")
# Test with proper parentheses
test_query2 = text("""
    SELECT system_id, reg_date, month_year, true_importer_name
    FROM analytics.product_icegate_imports 
    WHERE (true_importer_name IN (:imp_param_0) 
    OR true_supplier_name IN (:sup_param_0))
    AND reg_date >= :filter_param_2 AND reg_date <= :filter_param_3
    ORDER BY reg_date DESC
    LIMIT 10
""")

df2 = pd.read_sql(test_query2, engine, params=params)
print(f"\nResults with parentheses ({len(df2)} rows):")
for _, row in df2.iterrows():
    print(f"  {row['reg_date']} - {row['true_importer_name']}")

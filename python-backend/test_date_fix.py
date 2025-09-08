import sys
import os
sys.path.append('.')
from services import search_by_entities
from models import SearchFilters

# Create the same test filters
filters = SearchFilters(
    date_mode='range',
    start_date='2024-04-01', 
    end_date='2025-03-31'
)

print("Testing date filtering fix...")
print(f"Filter range: {filters.start_date} to {filters.end_date}")

# Test the search
result = search_by_entities(['KLJ RESOURCES LTD'], filters)
print(f'Number of results: {result["count"]}')

# Check dates in results
print("\nFirst 10 results with dates:")
for i, item in enumerate(result['data'][:10]):
    print(f"{i+1}. Date: {item['reg_date']}, Month-Year: {item['month_year']}")
    
# Check if any results are outside the range
invalid_dates = []
for item in result['data']:
    reg_date = str(item['reg_date'])  # Convert to string for comparison
    if reg_date > '2025-03-31' or reg_date < '2024-04-01':
        invalid_dates.append(reg_date)

if invalid_dates:
    print(f"\n❌ Found {len(invalid_dates)} invalid dates outside range:")
    for date in invalid_dates[:5]:  # Show first 5
        print(f"  - {date}")
else:
    print(f"\n✅ All {len(result['data'])} results are within the date range!")

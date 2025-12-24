#!/usr/bin/env python3
"""Test database connectivity for production debugging"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import pandas as pd

load_dotenv()

def test_connection():
    """Test database connection and query"""
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    print("=" * 60)
    print("DATABASE CONNECTION TEST")
    print("=" * 60)
    
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL not found in environment variables")
        return False
    
    print(f"✓ DATABASE_URL found")
    print(f"  Connection string: {DATABASE_URL[:30]}...{DATABASE_URL[-20:]}")
    print()
    
    try:
        print("Attempting to create engine...")
        engine = create_engine(DATABASE_URL)
        print("✓ Engine created successfully")
        print()
        
        print("Testing connection...")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 as test"))
            print("✓ Connection successful!")
            print()
            
        print("Testing unique_product_name query...")
        df = pd.read_sql(
            "SELECT DISTINCT unique_product_name FROM klj_analytics.product_icegate_imports WHERE unique_product_name IS NOT NULL LIMIT 10",
            engine
        )
        
        print(f"✓ Query successful! Retrieved {len(df)} rows")
        print(f"  Sample data:")
        for idx, row in df.head().iterrows():
            print(f"    - {row['unique_product_name']}")
        print()
        
        # Test full count
        df_count = pd.read_sql(
            "SELECT COUNT(DISTINCT unique_product_name) as count FROM klj_analytics.product_icegate_imports WHERE unique_product_name IS NOT NULL",
            engine
        )
        total_count = df_count.iloc[0]['count']
        print(f"✓ Total unique product names in database: {total_count}")
        print()
        
        print("=" * 60)
        print("✅ ALL TESTS PASSED - Database is accessible")
        print("=" * 60)
        return True
        
    except Exception as e:
        print("=" * 60)
        print("❌ ERROR: Database connection failed")
        print("=" * 60)
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print()
        import traceback
        print("Full traceback:")
        traceback.print_exc()
        print()
        print("=" * 60)
        print("TROUBLESHOOTING TIPS:")
        print("=" * 60)
        print("1. Check if .env file exists in production")
        print("2. Verify DATABASE_URL is set correctly")
        print("3. Check network connectivity to RDS")
        print("4. Verify security group allows connections")
        print("5. Check if database credentials are correct")
        print("=" * 60)
        return False

if __name__ == "__main__":
    test_connection()

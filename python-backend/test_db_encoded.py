from sqlalchemy import create_engine, text
from urllib.parse import quote_plus
from dotenv import load_dotenv
import os

load_dotenv()

# Get credentials
username = "klj_analytics_rw"
password = "uI5_HkBCB1Gcq2LYcQtX"
host = "crystal-dev-rds-postgres.c30ye0yuuri7.ap-south-1.rds.amazonaws.com"
port = "5432"
database = "postgres"

# URL encode the password
encoded_password = quote_plus(password)

# Try both encoded and non-encoded versions
urls = [
    f"postgresql://{username}:{password}@{host}:{port}/{database}",
    f"postgresql://{username}:{encoded_password}@{host}:{port}/{database}"
]

for i, url in enumerate(urls, 1):
    print(f"\n{'='*60}")
    print(f"Attempt {i}: {'Standard' if i == 1 else 'URL-encoded'} password")
    print(f"{'='*60}")
    
    try:
        engine = create_engine(url)
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✅ Connected successfully!")
            print(f"PostgreSQL version: {version[:80]}...")
            print(f"\n🎉 This connection string works!")
            print(f"DATABASE_URL=postgresql://{username}:{password if i == 1 else encoded_password}@{host}:{port}/{database}")
            break
    except Exception as e:
        print(f"❌ Failed: {str(e)[:200]}...")

print(f"\n{'='*60}")
print("🔍 IMPORTANT: If both failed, check AWS Security Group!")
print(f"Your IP: 103.51.116.91")
print(f"Action: Add this IP to RDS security group inbound rules")
print(f"{'='*60}")

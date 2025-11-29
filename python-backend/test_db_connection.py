from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Debug: Print the DATABASE_URL (masked password)
if DATABASE_URL:
    masked_url = DATABASE_URL.split('@')[0].split(':')[0] + ':****@' + DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else "Invalid format"
    print(f"📡 DATABASE_URL loaded: {masked_url}")
else:
    print("❌ DATABASE_URL is None! Check your .env file.")
    exit(1)

try:
    print("\n🔄 Testing database connection...")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # Test 1: Check PostgreSQL version
        result = connection.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        print(f"✅ Connected successfully!")
        print(f"📊 PostgreSQL version: {version[:80]}...")
        
        # Test 2: List available schemas
        result = connection.execute(text("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name"))
        schemas = [row[0] for row in result.fetchall()]
        print(f"\n📁 Available schemas: {', '.join(schemas)}")
        
        # Test 3: Check if analytics schema exists
        if 'analytics' in schemas:
            print("✅ 'analytics' schema found!")
            
            # Test 4: Check tables in analytics schema
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'analytics' 
                ORDER BY table_name
            """))
            tables = [row[0] for row in result.fetchall()]
            if tables:
                print(f"📋 Tables in 'analytics' schema: {', '.join(tables)}")
            else:
                print("⚠️  No tables found in 'analytics' schema")
        else:
            print("⚠️  'analytics' schema NOT found!")
            print("💡 Available schemas:", ', '.join(schemas))
        
except Exception as e:
    print(f"\n❌ Connection failed!")
    print(f"Error: {str(e)}")
    print("\n🔍 Troubleshooting tips:")
    print("1. Check if the database host is accessible")
    print("2. Verify username and password are correct")
    print("3. Ensure the database 'postgres' exists")
    print("4. Check if firewall/security groups allow connection from your IP")
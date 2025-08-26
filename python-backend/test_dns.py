# test_correct_dns.py
import socket
import os
from dotenv import load_dotenv

load_dotenv()

def test_dns():
    # Using the CORRECT hostname from your database details
    hostname = "crystal-analytics-db.c30ye0yuuri7.ap-south-1.rds.amazonaws.com"
    
    print(f"Testing DNS resolution for: {hostname}")
    
    try:
        ip_address = socket.gethostbyname(hostname)
        print(f"✅ DNS resolved to: {ip_address}")
        return True
    except socket.gaierror as e:
        print(f"❌ DNS resolution failed: {e}")
        return False

def test_connection():
    hostname = "crystal-analytics-db.c30ye0yuuri7.ap-south-1.rds.amazonaws.com"
    port = 5432
    
    print(f"Testing TCP connection to: {hostname}:{port}")
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((hostname, port))
        sock.close()
        
        if result == 0:
            print(f"✅ TCP connection successful")
            return True
        else:
            print(f"❌ TCP connection failed with code: {result}")
            return False
    except Exception as e:
        print(f"❌ TCP connection error: {e}")
        return False

def test_db_connection():
    print("\n=== Testing Database Connection ===")
    from sqlalchemy import create_engine, text
    
    db_url = "postgresql://crystalamit:Crystal%231234@crystal-analytics-db.c30ye0yuuri7.ap-south-1.rds.amazonaws.com:5432/postgres"
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✅ Database connected successfully!")
            print(f"PostgreSQL version: {version[:50]}...")
            
            # Test your specific table
            try:
                result = connection.execute(text("SELECT COUNT(*) FROM analytics.product_icegate_imports LIMIT 1"))
                count = result.fetchone()[0]
                print(f"✅ Table analytics.product_icegate_imports found with {count} records")
            except Exception as e:
                print(f"⚠️  Table check: {e}")
                
    except Exception as e:
        print(f"❌ Database connection failed: {e}")

if __name__ == "__main__":
    print("=== Network Connectivity Test (CORRECTED) ===")
    dns_ok = test_dns()
    if dns_ok:
        conn_ok = test_connection()
        if conn_ok:
            test_db_connection()
    
    print(f"\n=== Current DATABASE_URL ===")
    db_url = os.getenv("DATABASE_URL")
    print(f"Current: {db_url}")
    print(f"Correct: postgresql://crystalamit:Crystal%231234@crystal-analytics-db.c30ye0yuuri7.ap-south-1.rds.amazonaws.com:5432/postgres")
# services.py - Complete file with new functions
import pandas as pd
from typing import List, Dict, Any, Optional
from sqlalchemy import create_engine, text
from fuzzywuzzy import fuzz, process
from models import SearchFilters
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")

def get_engine():
    if not DATABASE_URL:
        raise Exception("DATABASE_URL not found in environment variables")
    return create_engine(DATABASE_URL)

# Fuzzy Search Functions
def clean_product_name(name: str) -> str:
    """Clean product name by removing codes and unnecessary characters"""
    import re
    # Remove leading numbers/codes (like 00000167343)
    cleaned = re.sub(r'^\d{8,}', '', name)
    # Remove repeated text patterns
    words = cleaned.split()
    # Remove duplicates while preserving order and filter out numeric codes
    seen = set()
    unique_words = []
    for word in words:
        word_lower = word.lower()
        # Skip if already seen or if it's a pure number
        if word_lower not in seen and not re.match(r'^\d+$', word):
            seen.add(word_lower)
            unique_words.append(word)
    return ' '.join(unique_words).strip()

def clean_entity_name(name: str) -> str:
    """Clean entity name by standardizing common company suffixes and formats"""
    import re
    # Remove extra whitespace and normalize
    cleaned = re.sub(r'\s+', ' ', name.strip())
    
    # Handle truncated names (common in entity data)
    # If name ends abruptly without common suffix, it might be truncated
    common_suffixes = ['LIMITED', 'LTD', 'PRIVATE', 'PVT', 'LLP', 'CORPORATION', 'CORP', 'INC', 'COMPANY', 'CO']
    
    # Check if name appears to be truncated (doesn't end with common business suffix)
    ends_with_suffix = any(cleaned.upper().endswith(suffix) for suffix in common_suffixes)
    
    # If it doesn't end with a suffix and ends with incomplete words, it might be truncated
    if not ends_with_suffix and len(cleaned) > 10:
        words = cleaned.split()
        last_word = words[-1] if words else ""
        
        # Special handling for common truncated patterns
        if last_word.upper() in ['LIMI', 'PRIV', 'LIMIT', 'PRIVAT']:
            # Remove the truncated word
            cleaned = ' '.join(words[:-1])
        elif len(last_word) < 4 and last_word.upper() not in ['LTD', 'LLC', 'INC', 'PVT', 'LLP', 'PTE']:
            # Remove very short last words that might be truncated
            cleaned = ' '.join(words[:-1])
    
    return cleaned.strip()

def fuzzy_match(query: str, choices: List[str], limit: int = 50, search_type: str = "general") -> List[str]:
    """Perform fuzzy matching and return top matches"""
    if not query or not choices:
        return []
    
    # For product_name searches, clean the choices first
    if search_type == "product_name":
        # Pre-filter choices by simple string matching for speed
        query_upper = query.upper()
        
        # Multi-tier filtering for better relevance
        exact_matches = []
        starts_with_matches = []
        contains_matches = []
        
        for choice in choices:
            choice_upper = choice.upper()
            if choice_upper == query_upper:
                exact_matches.append(choice)
            elif choice_upper.startswith(query_upper):
                starts_with_matches.append(choice)
            elif query_upper in choice_upper:
                contains_matches.append(choice)
        
        # Prioritize matches: exact > starts_with > contains > fuzzy
        priority_candidates = exact_matches + starts_with_matches + contains_matches
        
        # If we have enough high-priority matches, use those; otherwise include more for fuzzy matching
        if len(priority_candidates) >= limit * 2:
            choices_to_process = priority_candidates[:limit * 3]
        else:
            # Add some non-matching choices for fuzzy matching, but limit total
            remaining_choices = [c for c in choices if c not in priority_candidates][:2000]
            choices_to_process = priority_candidates + remaining_choices
        
        # Create a mapping of cleaned names to original names
        cleaned_to_original = {}
        cleaned_choices = []
        
        for choice in choices_to_process:
            cleaned = clean_product_name(choice)
            if len(cleaned) > 2:  # Only include meaningful cleaned names
                cleaned_choices.append(cleaned)
                cleaned_to_original[cleaned] = choice
        
        # Perform fuzzy matching on cleaned names with optimized settings
        matches = process.extractBests(
            query, 
            cleaned_choices, 
            scorer=fuzz.partial_ratio,  # Faster than token_sort_ratio
            score_cutoff=70,  # Higher cutoff for better quality
            limit=limit * 2  # Get more matches to account for deduplication
        )
        
        # Return original names
        return [cleaned_to_original[match[0]] for match in matches]
    
    elif search_type == "entity":
        # For entity searches, prioritize exact prefix matches
        query_upper = query.upper()
        all_results = []
        seen = set()
        
        print(f"Debug fuzzy_match: Query='{query}', Query_upper='{query_upper}', Choices count={len(choices)}")
        
        # First: Find exact prefix matches (entities starting with the query)
        prefix_matches = []
        
        for choice in choices:
            if choice.upper().startswith(query_upper):
                prefix_matches.append(choice)
        
        print(f"Debug fuzzy_match: Found {len(prefix_matches)} prefix matches: {prefix_matches[:5]}")
        
        # Sort prefix matches by length (shorter names first, as they're more likely to be exact matches)
        prefix_matches.sort(key=len)
        
        # Add prefix matches first
        for match in prefix_matches:
            if match not in seen and len(all_results) < limit:
                all_results.append(match)
                seen.add(match)
        
        # Second: Find entities that contain the query anywhere
        if len(all_results) < limit:
            contains_matches = []
            for choice in choices:
                if query_upper in choice.upper() and choice not in seen:
                    contains_matches.append(choice)
            
            print(f"Debug fuzzy_match: Found {len(contains_matches)} contains matches: {contains_matches[:5]}")
            
            # Sort by how early the query appears in the string
            contains_matches.sort(key=lambda x: x.upper().find(query_upper))
            
            # Add contains matches
            for match in contains_matches:
                if match not in seen and len(all_results) < limit:
                    all_results.append(match)
                    seen.add(match)
        
        # Third: If still not enough results, use fuzzy matching
        if len(all_results) < limit:
            fuzzy_matches = process.extractBests(
                query, 
                [choice for choice in choices if choice not in seen], 
                scorer=fuzz.partial_ratio,
                score_cutoff=75,
                limit=limit - len(all_results)
            )
            
            print(f"Debug fuzzy_match: Found {len(fuzzy_matches)} fuzzy matches: {[m[0] for m in fuzzy_matches][:5]}")
            
            # Add fuzzy matches
            for match in fuzzy_matches:
                if match[0] not in seen:
                    all_results.append(match[0])
                    seen.add(match[0])
        
        print(f"Debug fuzzy_match: Final results count={len(all_results)}: {all_results}")
        return all_results[:limit]
    
    else:
        # For other search types, use the original logic
        matches = process.extractBests(
            query, 
            choices, 
            scorer=fuzz.partial_ratio,
            score_cutoff=60,
            limit=limit
        )
        
        return [match[0] for match in matches]

# Cache for database lookups
_product_names_cache = None
_unique_product_names_cache = None
_entities_cache = None

def get_product_names():
    """Get all distinct product names with limited count for faster performance"""
    global _product_names_cache
    if _product_names_cache is None:
        try:
            engine = get_engine()
            # Limit to 10,000 most common products for faster performance
            df = pd.read_sql(
                """SELECT DISTINCT product_name 
                   FROM analytics.product_icegate_imports_experiment 
                   WHERE product_name IS NOT NULL 
                   LIMIT 10000""",
                engine
            )
            # Remove duplicates and clean empty entries
            unique_products = list(set(df["product_name"].tolist()))
            _product_names_cache = [p for p in unique_products if p.strip()]
            print(f"Loaded {len(_product_names_cache)} unique product names into cache")
        except Exception as e:
            print(f"Error loading product names: {e}")
            _product_names_cache = ["Sample Product 1", "Sample Product 2"]
    return _product_names_cache

def get_unique_product_names():
    """Get all distinct unique product names"""
    global _unique_product_names_cache
    if _unique_product_names_cache is None:
        try:
            engine = get_engine()
            df = pd.read_sql(
                "SELECT DISTINCT unique_product_name FROM analytics.product_icegate_imports_experiment WHERE unique_product_name IS NOT NULL",
                engine
            )
            _unique_product_names_cache = df["unique_product_name"].tolist()
            print(f"Loaded {len(_unique_product_names_cache)} unique product names into cache")
        except Exception as e:
            print(f"Error loading unique product names: {e}")
            _unique_product_names_cache = ["Sample Unique Product 1", "Sample Unique Product 2"]
    return _unique_product_names_cache

def get_entities():
    """Get all distinct entity names"""
    global _entities_cache
    if _entities_cache is None:
        try:
            engine = get_engine()
            # Get ALL importers (no limit)
            importer_df = pd.read_sql(
                "SELECT DISTINCT true_importer_name FROM analytics.product_icegate_imports_experiment WHERE true_importer_name IS NOT NULL",
                engine
            )
            
            # Get ALL suppliers (no limit)
            supplier_df = pd.read_sql(
                "SELECT DISTINCT true_supplier_name FROM analytics.product_icegate_imports_experiment WHERE true_supplier_name IS NOT NULL",
                engine
            )
            
            # Combine
            all_entities = set(
                importer_df["true_importer_name"].tolist() + 
                supplier_df["true_supplier_name"].tolist()
            )
            _entities_cache = list(all_entities)
            print(f"Loaded {len(_entities_cache)} entities into cache")
        except Exception as e:
            print(f"Error loading entities: {e}")
            _entities_cache = ["Sample Entity 1", "Sample Entity 2"]
    return _entities_cache

def get_fuzzy_suggestions(query: str, search_type: str, limit: int = 10) -> List[str]:
    """Get fuzzy suggestions based on search type"""
    try:
        if search_type == "product_name":
            choices = get_product_names()
            results = fuzzy_match(query, choices, limit * 2, search_type)  # Get more for deduplication
            
            # Remove duplicates while preserving order
            unique_results = []
            seen = set()
            for result in results:
                if result not in seen:
                    unique_results.append(result)
                    seen.add(result)
                if len(unique_results) >= limit:  # Stop early when we have enough
                    break
            
            return unique_results[:limit]
            
        elif search_type == "unique_product_name":
            choices = get_unique_product_names()
            return fuzzy_match(query, choices, limit, search_type)
            
        elif search_type == "entity":
            choices = get_entities()
            print(f"Debug: Found {len(choices)} entities in cache")
            print(f"Debug: First 5 entities: {choices[:5] if choices else 'None'}")
            
            # Check if there are any entities containing KLJ
            klj_entities = [entity for entity in choices if 'KLJ' in entity.upper()]
            print(f"Debug: Found {len(klj_entities)} entities containing 'KLJ': {klj_entities[:10]}")
            
            # Use improved entity matching
            results = fuzzy_match(query, choices, limit * 2, search_type)
            print(f"Debug: Fuzzy match returned {len(results)} results: {results}")
            return results[:limit]
            
        else:
            return []
        
    except Exception as e:
        print(f"Error in get_fuzzy_suggestions: {e}")
        import traceback
        traceback.print_exc()
        return []

def build_query_with_filters_dict(base_query: str, params: Dict, filters: Optional[SearchFilters]) -> tuple:
    """Build query with filters using dictionary parameters"""
    query = base_query
    
    if not filters:
        return query, params
    
    param_counter = len(params)
    
    # Additional filters
    if filters.hs_code:
        query += f" AND hs_code = :filter_param_{param_counter}"
        params[f"filter_param_{param_counter}"] = int(filters.hs_code)
        param_counter += 1
    
    if filters.importer_id:
        query += f" AND importer_id LIKE :filter_param_{param_counter}"
        params[f"filter_param_{param_counter}"] = f"%{filters.importer_id}%"
        param_counter += 1
    
    if filters.port_name:
        query += f" AND (indian_port LIKE :filter_param_{param_counter} OR foreign_port LIKE :filter_param_{param_counter + 1})"
        params[f"filter_param_{param_counter}"] = f"%{filters.port_name}%"
        params[f"filter_param_{param_counter + 1}"] = f"%{filters.port_name}%"
        param_counter += 2
    
    # Date filters
    if filters.date_mode == "single" and filters.single_date:
        print(f"DEBUG: Single date filter - {filters.single_date}")
        query += f" AND reg_date = :filter_param_{param_counter}"
        params[f"filter_param_{param_counter}"] = str(filters.single_date)
        param_counter += 1
    elif filters.date_mode == "range":
        if filters.start_date:
            print(f"DEBUG: Start date filter - {filters.start_date}")
            query += f" AND reg_date >= :filter_param_{param_counter}"
            params[f"filter_param_{param_counter}"] = str(filters.start_date)
            param_counter += 1
        if filters.end_date:
            print(f"DEBUG: End date filter - {filters.end_date}")
            query += f" AND reg_date <= :filter_param_{param_counter}"
            params[f"filter_param_{param_counter}"] = str(filters.end_date)
            param_counter += 1
    
    print(f"DEBUG: Final query - {query}")
    print(f"DEBUG: Final params - {params}")
    
    query += " ORDER BY reg_date DESC LIMIT 1000"
    return query, params

def search_by_product_names(product_names: List[str], filters: Optional[SearchFilters] = None) -> Dict[str, Any]:
    """Search by product names - returns all columns"""
    try:
        engine = get_engine()
        
        # Select all columns
        placeholders = ",".join([f":param_{i}" for i in range(len(product_names))])
        base_query = f"""
            SELECT system_id, reg_date, month_year, hs_code, chapter, unique_product_name, 
                   quantity, unit_quantity, unit_price_usd, total_value_usd, importer_id, 
                   true_importer_name, city, cha_number, type, true_supplier_name, 
                   indian_port, foreign_port, exchange_rate_usd, duty, 
                   product_name, supplier_name, supplier_address, target_date, id, importer
            FROM analytics.product_icegate_imports_experiment 
            WHERE product_name IN ({placeholders})
        """
        
        # Create parameters dictionary
        params = {f"param_{i}": name for i, name in enumerate(product_names)}
        
        # Add filters to query and params
        query, params = build_query_with_filters_dict(base_query, params, filters)
        
        # Execute query using text() for proper parameter binding
        df = pd.read_sql(text(query), engine, params=params)
        
        return {
            "data": df.to_dict('records'),
            "count": len(df),
            "search_type": "product_name",
            "total_records": len(df)
        }
    except Exception as e:
        print(f"Error in search_by_product_names: {e}")
        return {
            "data": [{"product_name": name, "error": "Database error", "sample": True} for name in product_names],
            "count": len(product_names),
            "search_type": "product_name",
            "error": str(e)
        }

def search_by_unique_product_names(unique_product_names: List[str], filters: Optional[SearchFilters] = None) -> Dict[str, Any]:
    """Search by unique product names - returns all columns"""
    try:
        engine = get_engine()
        
        # Select all columns
        placeholders = ",".join([f":param_{i}" for i in range(len(unique_product_names))])
        base_query = f"""
            SELECT system_id, reg_date, month_year, hs_code, chapter, unique_product_name, 
                   quantity, unit_quantity, unit_price_usd, total_value_usd, importer_id, 
                   true_importer_name, city, cha_number, type, true_supplier_name, 
                   indian_port, foreign_port, exchange_rate_usd, duty, 
                   product_name, supplier_name, supplier_address, target_date, id, importer
            FROM analytics.product_icegate_imports_experiment 
            WHERE unique_product_name IN ({placeholders})
        """
        
        # Create parameters dictionary
        params = {f"param_{i}": name for i, name in enumerate(unique_product_names)}
        
        # Add filters to query and params
        query, params = build_query_with_filters_dict(base_query, params, filters)
        
        # Execute query using text() for proper parameter binding
        df = pd.read_sql(text(query), engine, params=params)
        
        return {
            "data": df.to_dict('records'),
            "count": len(df),
            "search_type": "unique_product_name",
            "total_records": len(df)
        }
    except Exception as e:
        print(f"Error in search_by_unique_product_names: {e}")
        return {
            "data": [{"unique_product_name": name, "error": "Database error", "sample": True} for name in unique_product_names],
            "count": len(unique_product_names),
            "search_type": "unique_product_name",
            "error": str(e)
        }

def search_by_entities(entities: List[str], filters: Optional[SearchFilters] = None) -> Dict[str, Any]:
    """Search by entity names - returns all columns"""
    try:
        engine = get_engine()
        
        # Fixed: Use different parameter names for importer and supplier conditions
        importer_placeholders = ",".join([f":imp_param_{i}" for i in range(len(entities))])
        supplier_placeholders = ",".join([f":sup_param_{i}" for i in range(len(entities))])
        
        base_query = f"""
            SELECT system_id, reg_date, month_year, hs_code, chapter, unique_product_name, 
                   quantity, unit_quantity, unit_price_usd, total_value_usd, importer_id, 
                   true_importer_name, city, cha_number, type, true_supplier_name, 
                   indian_port, foreign_port, exchange_rate_usd, duty, 
                   product_name, supplier_name, supplier_address, target_date, id, importer
            FROM analytics.product_icegate_imports_experiment 
            WHERE (true_importer_name IN ({importer_placeholders}) 
            OR true_supplier_name IN ({supplier_placeholders}))
        """
        
        # Create parameters dictionary with different names for importers and suppliers
        params = {}
        for i, entity in enumerate(entities):
            params[f"imp_param_{i}"] = entity
            params[f"sup_param_{i}"] = entity
        
        # Add filters to query and params
        query, params = build_query_with_filters_dict(base_query, params, filters)
        
        # Execute query using text() for proper parameter binding
        df = pd.read_sql(text(query), engine, params=params)
        
        return {
            "data": df.to_dict('records'),
            "count": len(df),
            "search_type": "entity",
            "total_records": len(df)
        }
    except Exception as e:
        print(f"Error in search_by_entities: {e}")
        return {
            "data": [{"entity_name": name, "error": "Database error", "sample": True} for name in entities],
            "count": len(entities),
            "search_type": "entity",
            "error": str(e)
        }

def get_top_importers_by_product(product_names: List[str], filters: Optional[SearchFilters] = None, limit: int = 10) -> Dict[str, Any]:
    """Get top importers for specific products by total value"""
    try:
        engine = get_engine()
        
        # Build the base query with aggregation
        placeholders = ",".join([f":param_{i}" for i in range(len(product_names))])
        base_query = f"""
            SELECT 
                true_importer_name,
                importer_id,
                city,
                COUNT(*) as total_shipments,
                SUM(total_value_usd) as total_value_usd,
                SUM(quantity) as total_quantity,
                AVG(unit_price_usd) as avg_unit_price_usd,
                MIN(reg_date) as first_import_date,
                MAX(reg_date) as last_import_date,
                COUNT(DISTINCT hs_code) as unique_hs_codes,
                COUNT(DISTINCT origin_country) as unique_countries
            FROM analytics.product_icegate_imports_experiment 
            WHERE product_name IN ({placeholders})
            AND true_importer_name IS NOT NULL
            AND total_value_usd IS NOT NULL
        """
        
        # Create parameters dictionary
        params = {f"param_{i}": name for i, name in enumerate(product_names)}
        
        # Add filters (simplified for aggregation query)
        if filters:
            param_counter = len(params)
            
            if filters.hs_code:
                base_query += f" AND hs_code = :filter_param_{param_counter}"
                params[f"filter_param_{param_counter}"] = int(filters.hs_code)
                param_counter += 1
            
            if filters.importer_id:
                base_query += f" AND importer_id LIKE :filter_param_{param_counter}"
                params[f"filter_param_{param_counter}"] = f"%{filters.importer_id}%"
                param_counter += 1
            
            if filters.port_name:
                base_query += f" AND (indian_port LIKE :filter_param_{param_counter} OR foreign_port LIKE :filter_param_{param_counter + 1})"
                params[f"filter_param_{param_counter}"] = f"%{filters.port_name}%"
                params[f"filter_param_{param_counter + 1}"] = f"%{filters.port_name}%"
                param_counter += 2
                
            if filters.date_mode == "single" and filters.single_date:
                base_query += f" AND reg_date = :filter_param_{param_counter}"
                params[f"filter_param_{param_counter}"] = filters.single_date
                param_counter += 1
            elif filters.date_mode == "range":
                if filters.start_date:
                    base_query += f" AND reg_date >= :filter_param_{param_counter}"
                    params[f"filter_param_{param_counter}"] = filters.start_date
                    param_counter += 1
                if filters.end_date:
                    base_query += f" AND reg_date <= :filter_param_{param_counter}"
                    params[f"filter_param_{param_counter}"] = filters.end_date
                    param_counter += 1
        
        # Group by and order by total value
        base_query += f"""
            GROUP BY true_importer_name, importer_id, city
            ORDER BY total_value_usd DESC
            LIMIT {limit}
        """
        
        # Execute query
        df = pd.read_sql(text(base_query), engine, params=params)
        
        return {
            "data": df.to_dict('records'),
            "count": len(df),
            "search_type": "top_importers",
            "products_searched": product_names
        }
    except Exception as e:
        print(f"Error in get_top_importers_by_product: {e}")
        return {
            "data": [],
            "count": 0,
            "search_type": "top_importers",
            "error": str(e),
            "products_searched": product_names
        }

def get_top_importers_by_unique_product(unique_product_names: List[str], filters: Optional[SearchFilters] = None, limit: int = 10) -> Dict[str, Any]:
    """Get top importers for specific unique products by total value"""
    try:
        engine = get_engine()
        
        placeholders = ",".join([f":param_{i}" for i in range(len(unique_product_names))])
        base_query = f"""
            SELECT 
                true_importer_name,
                importer_id,
                city,
                COUNT(*) as total_shipments,
                SUM(total_value_usd) as total_value_usd,
                SUM(quantity) as total_quantity,
                AVG(unit_price_usd) as avg_unit_price_usd,
                MIN(reg_date) as first_import_date,
                MAX(reg_date) as last_import_date,
                COUNT(DISTINCT hs_code) as unique_hs_codes,
                COUNT(DISTINCT origin_country) as unique_countries
            FROM analytics.product_icegate_imports_experiment 
            WHERE unique_product_name IN ({placeholders})
            AND true_importer_name IS NOT NULL
            AND total_value_usd IS NOT NULL
        """
        
        params = {f"param_{i}": name for i, name in enumerate(unique_product_names)}
        
        # Add filters (similar to above)
        if filters:
            param_counter = len(params)
            
            if filters.hs_code:
                base_query += f" AND hs_code = :filter_param_{param_counter}"
                params[f"filter_param_{param_counter}"] = int(filters.hs_code)
                param_counter += 1
            
            if filters.importer_id:
                base_query += f" AND importer_id LIKE :filter_param_{param_counter}"
                params[f"filter_param_{param_counter}"] = f"%{filters.importer_id}%"
                param_counter += 1
            
            if filters.port_name:
                base_query += f" AND (indian_port LIKE :filter_param_{param_counter} OR foreign_port LIKE :filter_param_{param_counter + 1})"
                params[f"filter_param_{param_counter}"] = f"%{filters.port_name}%"
                params[f"filter_param_{param_counter + 1}"] = f"%{filters.port_name}%"
                param_counter += 2
                
            if filters.date_mode == "single" and filters.single_date:
                base_query += f" AND reg_date = :filter_param_{param_counter}"
                params[f"filter_param_{param_counter}"] = filters.single_date
                param_counter += 1
            elif filters.date_mode == "range":
                if filters.start_date:
                    base_query += f" AND reg_date >= :filter_param_{param_counter}"
                    params[f"filter_param_{param_counter}"] = filters.start_date
                    param_counter += 1
                if filters.end_date:
                    base_query += f" AND reg_date <= :filter_param_{param_counter}"
                    params[f"filter_param_{param_counter}"] = filters.end_date
                    param_counter += 1
        
        base_query += f"""
            GROUP BY true_importer_name, importer_id, city
            ORDER BY total_value_usd DESC
            LIMIT {limit}
        """
        
        df = pd.read_sql(text(base_query), engine, params=params)
        
        return {
            "data": df.to_dict('records'),
            "count": len(df),
            "search_type": "top_importers",
            "products_searched": unique_product_names
        }
    except Exception as e:
        print(f"Error in get_top_importers_by_unique_product: {e}")
        return {
            "data": [],
            "count": 0,
            "search_type": "top_importers",
            "error": str(e),
            "products_searched": unique_product_names
        }

def get_top_suppliers_by_product(product_names: List[str], filters: Optional[SearchFilters] = None, limit: int = 10) -> Dict[str, Any]:
    """Get top suppliers for specific products by total value"""
    try:
        engine = get_engine()
        
        # Build the base query with aggregation
        placeholders = ",".join([f":param_{i}" for i in range(len(product_names))])
        base_query = f"""
            SELECT 
                true_supplier_name,
                supplier_name,
                COUNT(*) as total_shipments,
                SUM(total_value_usd) as total_value_usd,
                SUM(quantity) as total_quantity,
                AVG(unit_price_usd) as avg_unit_price_usd,
                MIN(reg_date) as first_export_date,
                MAX(reg_date) as last_export_date,
                COUNT(DISTINCT hs_code) as unique_hs_codes,
                COUNT(DISTINCT true_importer_name) as unique_importers
            FROM analytics.product_icegate_imports_experiment 
            WHERE product_name IN ({placeholders})
            AND true_supplier_name IS NOT NULL
            AND total_value_usd IS NOT NULL
        """
        
        # Create parameters dictionary
        params = {f"param_{i}": name for i, name in enumerate(product_names)}
        
        # Add filters (simplified for aggregation query)
        if filters:
            param_counter = len(params)
            
            if filters.hs_code:
                base_query += f" AND hs_code = :filter_param_{param_counter}"
                params[f"filter_param_{param_counter}"] = int(filters.hs_code)
                param_counter += 1
            
            if filters.importer_id:
                base_query += f" AND importer_id LIKE :filter_param_{param_counter}"
                params[f"filter_param_{param_counter}"] = f"%{filters.importer_id}%"
                param_counter += 1
            
            if filters.port_name:
                base_query += f" AND (indian_port LIKE :filter_param_{param_counter} OR foreign_port LIKE :filter_param_{param_counter + 1})"
                params[f"filter_param_{param_counter}"] = f"%{filters.port_name}%"
                params[f"filter_param_{param_counter + 1}"] = f"%{filters.port_name}%"
                param_counter += 2
                
            if filters.date_mode == "single" and filters.single_date:
                base_query += f" AND reg_date = :filter_param_{param_counter}"
                params[f"filter_param_{param_counter}"] = filters.single_date
                param_counter += 1
            elif filters.date_mode == "range":
                if filters.start_date:
                    base_query += f" AND reg_date >= :filter_param_{param_counter}"
                    params[f"filter_param_{param_counter}"] = filters.start_date
                    param_counter += 1
                if filters.end_date:
                    base_query += f" AND reg_date <= :filter_param_{param_counter}"
                    params[f"filter_param_{param_counter}"] = filters.end_date
                    param_counter += 1
        
        # Group by and order by total value
        base_query += f"""
            GROUP BY true_supplier_name, supplier_name
            ORDER BY total_value_usd DESC
            LIMIT {limit}
        """
        
        # Execute query
        df = pd.read_sql(text(base_query), engine, params=params)
        
        return {
            "data": df.to_dict('records'),
            "count": len(df),
            "search_type": "top_suppliers",
            "products_searched": product_names
        }
    except Exception as e:
        print(f"Error in get_top_suppliers_by_product: {e}")
        return {
            "data": [],
            "count": 0,
            "search_type": "top_suppliers",
            "error": str(e),
            "products_searched": product_names
        }

def get_top_suppliers_by_unique_product(unique_product_names: List[str], filters: Optional[SearchFilters] = None, limit: int = 10) -> Dict[str, Any]:
    """Get top suppliers for specific unique products by total value"""
    try:
        engine = get_engine()
        
        # Build the base query with aggregation
        placeholders = ",".join([f":param_{i}" for i in range(len(unique_product_names))])
        base_query = f"""
            SELECT 
                true_supplier_name,
                supplier_name,
                COUNT(*) as total_shipments,
                SUM(total_value_usd) as total_value_usd,
                SUM(quantity) as total_quantity,
                AVG(unit_price_usd) as avg_unit_price_usd,
                MIN(reg_date) as first_export_date,
                MAX(reg_date) as last_export_date,
                COUNT(DISTINCT hs_code) as unique_hs_codes,
                COUNT(DISTINCT true_importer_name) as unique_importers
            FROM analytics.product_icegate_imports_experiment 
            WHERE unique_product_name IN ({placeholders})
            AND true_supplier_name IS NOT NULL
            AND total_value_usd IS NOT NULL
        """
        
        # Create parameters dictionary
        params = {f"param_{i}": name for i, name in enumerate(unique_product_names)}
        
        # Add filters (simplified for aggregation query)
        if filters:
            param_counter = len(params)
            
            if filters.hs_code:
                base_query += f" AND hs_code = :filter_param_{param_counter}"
                params[f"filter_param_{param_counter}"] = int(filters.hs_code)
                param_counter += 1
            
            if filters.importer_id:
                base_query += f" AND importer_id LIKE :filter_param_{param_counter}"
                params[f"filter_param_{param_counter}"] = f"%{filters.importer_id}%"
                param_counter += 1
            
            if filters.port_name:
                base_query += f" AND (indian_port LIKE :filter_param_{param_counter} OR foreign_port LIKE :filter_param_{param_counter + 1})"
                params[f"filter_param_{param_counter}"] = f"%{filters.port_name}%"
                params[f"filter_param_{param_counter + 1}"] = f"%{filters.port_name}%"
                param_counter += 2
                
            if filters.date_mode == "single" and filters.single_date:
                base_query += f" AND reg_date = :filter_param_{param_counter}"
                params[f"filter_param_{param_counter}"] = filters.single_date
                param_counter += 1
            elif filters.date_mode == "range":
                if filters.start_date:
                    base_query += f" AND reg_date >= :filter_param_{param_counter}"
                    params[f"filter_param_{param_counter}"] = filters.start_date
                    param_counter += 1
                if filters.end_date:
                    base_query += f" AND reg_date <= :filter_param_{param_counter}"
                    params[f"filter_param_{param_counter}"] = filters.end_date
                    param_counter += 1
        
        base_query += f"""
            GROUP BY true_supplier_name, supplier_name
            ORDER BY total_value_usd DESC
            LIMIT {limit}
        """
        
        # Execute query
        df = pd.read_sql(text(base_query), engine, params=params)
        
        return {
            "data": df.to_dict('records'),
            "count": len(df),
            "search_type": "top_suppliers",
            "products_searched": unique_product_names
        }
    except Exception as e:
        print(f"Error in get_top_suppliers_by_unique_product: {e}")
        return {
            "data": [],
            "count": 0,
            "search_type": "top_suppliers",
            "error": str(e),
            "products_searched": unique_product_names
        }
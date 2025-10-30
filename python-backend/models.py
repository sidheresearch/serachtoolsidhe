# models.py
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date

class SearchFilters(BaseModel):
    hs_code: Optional[str] = None
    importer_id: Optional[str] = None
    port_name: Optional[str] = None
    single_date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    date_mode: Optional[str] = "single"  # 'single' or 'range'

class ProductSearchRequest(BaseModel):
    product_names: List[str]
    filters: Optional[SearchFilters] = None

class UniqueProductSearchRequest(BaseModel):
    unique_product_names: List[str]
    filters: Optional[SearchFilters] = None

class EntitySearchRequest(BaseModel):
    entities: List[str]
    filters: Optional[SearchFilters] = None

class HSCodeSearchRequest(BaseModel):
    hs_codes: List[str]
    filters: Optional[SearchFilters] = None
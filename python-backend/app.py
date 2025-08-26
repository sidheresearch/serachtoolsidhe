# app.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from models import ProductSearchRequest, UniqueProductSearchRequest, EntitySearchRequest
from services import (
    get_fuzzy_suggestions,
    search_by_product_names,
    search_by_unique_product_names,
    search_by_entities,
    get_top_importers_by_product,
    get_top_importers_by_unique_product,
    get_top_suppliers_by_product,
    get_top_suppliers_by_unique_product
)

app = FastAPI(title="Trade Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Trade Analytics API", "status": "running"}

@app.get("/api/search/suggestions")
def get_suggestions(
    query: str = Query(...),
    search_type: str = Query(...),
    limit: int = Query(10)
):
    """Get fuzzy search suggestions"""
    try:
        suggestions = get_fuzzy_suggestions(query, search_type, limit)
        return {
            "suggestions": suggestions,
            "query": query,
            "search_type": search_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/search/products")
def search_products(request: ProductSearchRequest):
    """Search by product names"""
    try:
        if not request.product_names:
            raise HTTPException(status_code=400, detail="Product names cannot be empty")
        
        result = search_by_product_names(request.product_names, request.filters)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/search/unique-products")
def search_unique_products(request: UniqueProductSearchRequest):
    """Search by unique product names"""
    try:
        if not request.unique_product_names:
            raise HTTPException(status_code=400, detail="Unique product names cannot be empty")
        
        result = search_by_unique_product_names(request.unique_product_names, request.filters)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/search/entities")
def search_entities(request: EntitySearchRequest):
    """Search by entity names"""
    try:
        if not request.entities:
            raise HTTPException(status_code=400, detail="Entities cannot be empty")
        
        result = search_by_entities(request.entities, request.filters)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Fixed top importers endpoints - using existing request models
@app.post("/api/search/top-importers/products")
async def get_top_importers_products(request: ProductSearchRequest):
    """Get top importers for product names"""
    try:
        if not request.product_names:
            raise HTTPException(status_code=400, detail="Product names cannot be empty")
            
        result = get_top_importers_by_product(
            request.product_names, 
            request.filters,
            limit=10
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/search/top-importers/unique-products")
async def get_top_importers_unique_products(request: UniqueProductSearchRequest):
    """Get top importers for unique product names"""
    try:
        if not request.unique_product_names:
            raise HTTPException(status_code=400, detail="Unique product names cannot be empty")
            
        result = get_top_importers_by_unique_product(
            request.unique_product_names, 
            request.filters,
            limit=10
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Top Suppliers endpoints
@app.post("/api/search/top-suppliers/products")
async def get_top_suppliers_products(request: ProductSearchRequest):
    """Get top suppliers for product names"""
    try:
        if not request.product_names:
            raise HTTPException(status_code=400, detail="Product names cannot be empty")
            
        result = get_top_suppliers_by_product(
            request.product_names, 
            request.filters,
            limit=10
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/search/top-suppliers/unique-products")
async def get_top_suppliers_unique_products(request: UniqueProductSearchRequest):
    """Get top suppliers for unique product names"""
    try:
        if not request.unique_product_names:
            raise HTTPException(status_code=400, detail="Unique product names cannot be empty")
            
        result = get_top_suppliers_by_unique_product(
            request.unique_product_names, 
            request.filters,
            limit=10
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
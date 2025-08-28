// app/utils/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SuggestionResponse {
  suggestions: string[];
  query: string;
  search_type: string;
}

export interface SearchFilters {
  hs_code?: string;
  importer_id?: string;
  port_name?: string;
  single_date?: string;
  start_date?: string;
  end_date?: string;
  date_mode?: 'single' | 'range';
}

export interface SearchResponse {
  data: Record<string, unknown>[];
  count: number;
  search_type: string;
  error?: string;
}

export interface TopImportersResponse {
  data: {
    true_importer_name: string;
    importer_id: string;
    city: string;
    total_shipments: number;
    total_value_usd: number;
    total_quantity: number;
    avg_unit_price_usd: number;
    first_import_date: string;
    last_import_date: string;
    unique_hs_codes: number;
    unique_countries: number;
  }[];
  count: number;
  search_type: string;
  products_searched: string[];
  error?: string;
}

export interface TopSuppliersResponse {
  data: {
    true_supplier_name: string;
    supplier_name: string;
    origin_country: string;
    total_shipments: number;
    total_value_usd: number;
    total_quantity: number;
    avg_unit_price_usd: number;
    first_export_date: string;
    last_export_date: string;
    unique_hs_codes: number;
    unique_importers: number;
  }[];
  count: number;
  search_type: string;
  products_searched: string[];
  error?: string;
}

export const tradeAPI = {
  // Get fuzzy suggestions with debouncing support
  async getFuzzySuggestions(
    query: string, 
    searchType: 'product_name' | 'unique_product_name' | 'entity', 
    limit: number = 10
  ): Promise<SuggestionResponse> {
    if (!query || query.length < 2) {
      return { suggestions: [], query, search_type: searchType };
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/search/suggestions?query=${encodeURIComponent(query)}&search_type=${searchType}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      throw new Error('Failed to fetch suggestions');
    }
  },

  // Search by product names
  async searchProducts(productNames: string[], filters?: SearchFilters): Promise<SearchResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/search/products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          product_names: productNames, 
          filters: filters || {} 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching products:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to search products');
    }
  },

  // Search by unique product names
  async searchUniqueProducts(uniqueProductNames: string[], filters?: SearchFilters): Promise<SearchResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/search/unique-products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          unique_product_names: uniqueProductNames, 
          filters: filters || {} 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching unique products:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to search unique products');
    }
  },

  // Search by entities
  async searchEntities(entities: string[], filters?: SearchFilters): Promise<SearchResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/search/entities`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          entities, 
          filters: filters || {} 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching entities:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to search entities');
    }
  },

  // Get top importers for products
  async getTopImportersForProducts(productNames: string[], filters?: SearchFilters): Promise<TopImportersResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/search/top-importers/products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          product_names: productNames, 
          filters: filters || {} 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching top importers:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch top importers');
    }
  },

  // Get top importers for unique products
  async getTopImportersForUniqueProducts(uniqueProductNames: string[], filters?: SearchFilters): Promise<TopImportersResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/search/top-importers/unique-products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          unique_product_names: uniqueProductNames, 
          filters: filters || {} 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching top importers:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch top importers');
    }
  },

  // Get top suppliers for products
  async getTopSuppliersForProducts(productNames: string[], filters?: SearchFilters): Promise<TopSuppliersResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/search/top-suppliers/products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          product_names: productNames, 
          filters: filters || {} 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching top suppliers:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch top suppliers');
    }
  },

  // Get top suppliers for unique products
  async getTopSuppliersForUniqueProducts(uniqueProductNames: string[], filters?: SearchFilters): Promise<TopSuppliersResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/search/top-suppliers/unique-products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          unique_product_names: uniqueProductNames, 
          filters: filters || {} 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching top suppliers:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch top suppliers');
    }
  }
};
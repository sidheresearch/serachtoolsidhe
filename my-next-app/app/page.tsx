'use client';
import { useState } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Typography, 
  Box, 
  InputAdornment,
  Fade,
  Card,
  CardContent,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Button,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Snackbar,
  Pagination
} from '@mui/material';
import { Grid } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { AutocompleteInput } from './components/AutocompleteInput';
import { tradeAPI, SearchResponse, TopImportersResponse, TopSuppliersResponse } from './utils/api';
import { Search, Business, Tag, DateRange, CalendarToday, QrCode, PersonPin, LocationOn, FilterList, Download, Visibility, TrendingUp } from '@mui/icons-material';
import { ImporterChart } from './components/ImporterChart';

export default function Home() {
  // State management
  const [productNames, setProductNames] = useState<string[]>([]);
  const [uniqueProductNames, setUniqueProductNames] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  
  const [hsCode, setHsCode] = useState('');
  const [importerId, setImporterId] = useState('');
  const [portName, setPortName] = useState('');
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [singleDate, setSingleDate] = useState<Dayjs | null>(null);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  
  // API state
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Top Importers state
  const [topImporters, setTopImporters] = useState<TopImportersResponse | null>(null);
  const [showTopImporters, setShowTopImporters] = useState(false);
  const [loadingTopImporters, setLoadingTopImporters] = useState(false);
  
  // Top Suppliers state
  const [topSuppliers, setTopSuppliers] = useState<TopSuppliersResponse | null>(null);
  const [showTopSuppliers, setShowTopSuppliers] = useState(false);
  const [loadingTopSuppliers, setLoadingTopSuppliers] = useState(false);

  const itemsPerPage = 10;

  const handlePrimarySearch = async () => {
    // Check if at least one primary field is filled
    if (productNames.length === 0 && uniqueProductNames.length === 0 && entities.length === 0) {
      setSearchError('Please select at least one item from the suggestions');
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    setCurrentPage(1);
    
    try {
      const filters = {
        hs_code: hsCode || undefined,
        importer_id: importerId || undefined,
        port_name: portName || undefined,
        date_mode: dateMode,
        single_date: dateMode === 'single' && singleDate ? singleDate.format('YYYY-MM-DD') : undefined,
        start_date: dateMode === 'range' && startDate ? startDate.format('YYYY-MM-DD') : undefined,
        end_date: dateMode === 'range' && endDate ? endDate.format('YYYY-MM-DD') : undefined,
      };

      let results: SearchResponse;
      
      // Call appropriate API based on what's selected
      if (productNames.length > 0) {
        results = await tradeAPI.searchProducts(productNames, filters);
        setSuccessMessage(`Found ${results.count} products matching your search criteria`);
      } else if (uniqueProductNames.length > 0) {
        results = await tradeAPI.searchUniqueProducts(uniqueProductNames, filters);
        setSuccessMessage(`Found ${results.count} unique products matching your search criteria`);
      } else if (entities.length > 0) {
        results = await tradeAPI.searchEntities(entities, filters);
        setSuccessMessage(`Found ${results.count} records for the selected entities`);
      } else {
        throw new Error('No search criteria provided');
      }

      console.log('Search results:', results);
      setSearchResults(results);
      setHasData(true);
      setShowFilters(true);
      
      // Auto-refresh top importers if they were already showing
      if (showTopImporters && (productNames.length > 0 || uniqueProductNames.length > 0)) {
        await refreshTopImporters(filters);
      }
      
      // Auto-refresh top suppliers if they were already showing
      if (showTopSuppliers && (productNames.length > 0 || uniqueProductNames.length > 0)) {
        await refreshTopSuppliers(filters);
      }
      
    } catch (error) {
      console.error('Search failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Search failed. Please try again.';
      setSearchError(errorMessage);
      setSearchResults(null);
      setHasData(false);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setProductNames([]);
    setUniqueProductNames([]);
    setEntities([]);
    setHsCode('');
    setImporterId('');
    setPortName('');
    setSingleDate(null);
    setStartDate(null);
    setEndDate(null);
    setHasData(false);
    setSearchResults(null);
    setSearchError(null);
    setShowFilters(false);
    setCurrentPage(1);
    setSuccessMessage(null);
    setTopImporters(null);
    setShowTopImporters(false);
    setTopSuppliers(null);
    setShowTopSuppliers(false);
  };

  const exportResults = () => {
    if (!searchResults?.data?.length) return;
    
    // Create CSV content
    const headers = Object.keys(searchResults.data[0]).join(',');
    const rows = searchResults.data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Helper function to refresh top importers with current filters
  const refreshTopImporters = async (filters?: any) => {
    if (!productNames.length && !uniqueProductNames.length) return;
    
    try {
      const currentFilters = filters || {
        hs_code: hsCode || undefined,
        importer_id: importerId || undefined,
        port_name: portName || undefined,
        date_mode: dateMode,
        single_date: dateMode === 'single' && singleDate ? singleDate.format('YYYY-MM-DD') : undefined,
        start_date: dateMode === 'range' && startDate ? startDate.format('YYYY-MM-DD') : undefined,
        end_date: dateMode === 'range' && endDate ? endDate.format('YYYY-MM-DD') : undefined,
      };

      let importersData: TopImportersResponse;
      
      if (productNames.length > 0) {
        importersData = await tradeAPI.getTopImportersForProducts(productNames, currentFilters);
      } else if (uniqueProductNames.length > 0) {
        importersData = await tradeAPI.getTopImportersForUniqueProducts(uniqueProductNames, currentFilters);
      } else {
        return;
      }

      setTopImporters(importersData);
    } catch (error) {
      console.error('Error refreshing top importers:', error);
    }
  };

  const fetchTopImporters = async () => {
    if (!searchResults || (!productNames.length && !uniqueProductNames.length)) return;
    
    setLoadingTopImporters(true);
    try {
      const filters = {
        hs_code: hsCode || undefined,
        importer_id: importerId || undefined,
        port_name: portName || undefined,
        date_mode: dateMode,
        single_date: dateMode === 'single' && singleDate ? singleDate.format('YYYY-MM-DD') : undefined,
        start_date: dateMode === 'range' && startDate ? startDate.format('YYYY-MM-DD') : undefined,
        end_date: dateMode === 'range' && endDate ? endDate.format('YYYY-MM-DD') : undefined,
      };

      let importersData: TopImportersResponse;
      
      if (productNames.length > 0) {
        importersData = await tradeAPI.getTopImportersForProducts(productNames, filters);
      } else if (uniqueProductNames.length > 0) {
        importersData = await tradeAPI.getTopImportersForUniqueProducts(uniqueProductNames, filters);
      } else {
        return;
      }

      setTopImporters(importersData);
      setShowTopImporters(true);
    } catch (error) {
      console.error('Error fetching top importers:', error);
      setSearchError('Failed to fetch top importers data');
    } finally {
      setLoadingTopImporters(false);
    }
  };

  // Helper function to refresh top suppliers with current filters
  const refreshTopSuppliers = async (filters?: any) => {
    if (!productNames.length && !uniqueProductNames.length) return;
    
    try {
      const currentFilters = filters || {
        hs_code: hsCode || undefined,
        importer_id: importerId || undefined,
        port_name: portName || undefined,
        date_mode: dateMode,
        single_date: dateMode === 'single' && singleDate ? singleDate.format('YYYY-MM-DD') : undefined,
        start_date: dateMode === 'range' && startDate ? startDate.format('YYYY-MM-DD') : undefined,
        end_date: dateMode === 'range' && endDate ? endDate.format('YYYY-MM-DD') : undefined,
      };

      let suppliersData: TopSuppliersResponse;
      
      if (productNames.length > 0) {
        suppliersData = await tradeAPI.getTopSuppliersForProducts(productNames, currentFilters);
      } else if (uniqueProductNames.length > 0) {
        suppliersData = await tradeAPI.getTopSuppliersForUniqueProducts(uniqueProductNames, currentFilters);
      } else {
        return;
      }

      setTopSuppliers(suppliersData);
    } catch (error) {
      console.error('Error refreshing top suppliers:', error);
    }
  };

  const fetchTopSuppliers = async () => {
    if (!searchResults || (!productNames.length && !uniqueProductNames.length)) return;
    
    setLoadingTopSuppliers(true);
    try {
      const filters = {
        hs_code: hsCode || undefined,
        importer_id: importerId || undefined,
        port_name: portName || undefined,
        date_mode: dateMode,
        single_date: dateMode === 'single' && singleDate ? singleDate.format('YYYY-MM-DD') : undefined,
        start_date: dateMode === 'range' && startDate ? startDate.format('YYYY-MM-DD') : undefined,
        end_date: dateMode === 'range' && endDate ? endDate.format('YYYY-MM-DD') : undefined,
      };

      let suppliersData: TopSuppliersResponse;
      
      if (productNames.length > 0) {
        suppliersData = await tradeAPI.getTopSuppliersForProducts(productNames, filters);
      } else if (uniqueProductNames.length > 0) {
        suppliersData = await tradeAPI.getTopSuppliersForUniqueProducts(uniqueProductNames, filters);
      } else {
        return;
      }

      setTopSuppliers(suppliersData);
      setShowTopSuppliers(true);
    } catch (error) {
      console.error('Error fetching top suppliers:', error);
      setSearchError('Failed to fetch top suppliers data');
    } finally {
      setLoadingTopSuppliers(false);
    }
  };

  // Pagination
  const totalPages = searchResults ? Math.ceil(searchResults.data.length / itemsPerPage) : 0;
  const paginatedData = searchResults?.data?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) || [];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box 
        sx={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 4
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
          <Fade in={true} timeout={1000}>
            <Box>
              {/* Header Section */}
              <Box textAlign="center" mb={6}>
                <Typography 
                  variant="h3" 
                  component="h1" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 800,
                    color: 'white',
                    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    mb: 2,
                  }}
                >
                   Trade Analytics Tool
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.9)',
                    maxWidth: 600, 
                    mx: 'auto',
                    fontWeight: 400,
                    textShadow: '0 1px 5px rgba(0,0,0,0.2)',
                  }}
                >
                  Discover and analyze trade data with advanced search capabilities
                </Typography>
              </Box>

              {/* Main Search Card */}
              <Card 
                elevation={24}
                sx={{ 
                  borderRadius: '24px',
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  overflow: 'visible',
                  position: 'relative',
                }}
              >
                <CardContent sx={{ p: { xs: 3, sm: 4, md: 6 } }}>
                  {/* Primary Search Section */}
                  <Box mb={4}>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        mb: 1, 
                        fontWeight: 700, 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      Search Products
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                      Start typing to see suggestions and select from the dropdown
                    </Typography>

                    <Grid container spacing={4}>
                      <Grid item xs={12}>
                        <AutocompleteInput
                          label="Search by Product Name"
                          placeholder="Type to search products..."
                          searchType="product_name"
                          value={productNames}
                          onChange={setProductNames}
                          disabled={isLoading}
                          icon={<Search sx={{ color: '#667eea' }} />}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '16px',
                              minHeight: '72px',
                              fontSize: '18px',
                              minWidth: '100%',
                              transition: 'all 0.3s ease',
                              backgroundColor: 'rgba(102, 126, 234, 0.03)',
                              border: '2px solid rgba(102, 126, 234, 0.1)',
                              '&:hover': {
                                backgroundColor: 'rgba(102, 126, 234, 0.08)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.15)',
                                borderColor: 'rgba(102, 126, 234, 0.3)',
                              },
                              '&.Mui-focused': {
                                backgroundColor: 'rgba(102, 126, 234, 0.08)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 30px rgba(102, 126, 234, 0.25)',
                                borderColor: '#667eea',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              fontSize: '18px',
                              fontWeight: 500,
                            },
                            '& .MuiAutocomplete-input': {
                              fontSize: '18px',
                              padding: '16px 8px',
                            },
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <AutocompleteInput
                          label="Search by Unique Product Name"
                          placeholder="Type to search unique products..."
                          searchType="unique_product_name"
                          value={uniqueProductNames}
                          onChange={setUniqueProductNames}
                          disabled={isLoading}
                          icon={<Tag sx={{ color: '#764ba2' }} />}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '16px',
                              minHeight: '72px',
                              fontSize: '18px',
                              minWidth: '100%',
                              transition: 'all 0.3s ease',
                              backgroundColor: 'rgba(118, 75, 162, 0.03)',
                              border: '2px solid rgba(118, 75, 162, 0.1)',
                              '&:hover': {
                                backgroundColor: 'rgba(118, 75, 162, 0.08)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 25px rgba(118, 75, 162, 0.15)',
                                borderColor: 'rgba(118, 75, 162, 0.3)',
                              },
                              '&.Mui-focused': {
                                backgroundColor: 'rgba(118, 75, 162, 0.08)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 30px rgba(118, 75, 162, 0.25)',
                                borderColor: '#764ba2',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              fontSize: '18px',
                              fontWeight: 500,
                            },
                            '& .MuiAutocomplete-input': {
                              fontSize: '18px',
                              padding: '16px 8px',
                            },
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <AutocompleteInput
                          label="Search by Entity"
                          placeholder="Type to search entities..."
                          searchType="entity"
                          value={entities}
                          onChange={setEntities}
                          disabled={isLoading}
                          icon={<Business sx={{ color: '#10b981' }} />}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '16px',
                              minHeight: '72px',
                              fontSize: '18px',
                              minWidth: '100%',
                              transition: 'all 0.3s ease',
                              backgroundColor: 'rgba(16, 185, 129, 0.03)',
                              border: '2px solid rgba(16, 185, 129, 0.1)',
                              '&:hover': {
                                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.15)',
                                borderColor: 'rgba(16, 185, 129, 0.3)',
                              },
                              '&.Mui-focused': {
                                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 30px rgba(16, 185, 129, 0.25)',
                                borderColor: '#10b981',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              fontSize: '18px',
                              fontWeight: 500,
                            },
                            '& .MuiAutocomplete-input': {
                              fontSize: '18px',
                              padding: '16px 8px',
                            },
                          }}
                        />
                      </Grid>
                    </Grid>

                    {/* Search Action Buttons */}
                    <Box sx={{ mt: 5, display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={handlePrimarySearch}
                        disabled={isLoading || (productNames.length === 0 && uniqueProductNames.length === 0 && entities.length === 0)}
                        sx={{
                          borderRadius: '16px',
                          px: 6,
                          py: 2,
                          fontSize: '16px',
                          fontWeight: 600,
                          minWidth: '200px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                            transform: 'translateY(-3px)',
                            boxShadow: '0 12px 35px rgba(102, 126, 234, 0.4)',
                          },
                          '&:disabled': {
                            background: 'rgba(0, 0, 0, 0.12)',
                            transform: 'none',
                            boxShadow: 'none',
                          }
                        }}
                        startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <Search />}
                      >
                        {isLoading ? 'Searching...' : 'Search '}
                      </Button>
                      
                      {(productNames.length > 0 || uniqueProductNames.length > 0 || entities.length > 0) && (
                        <Button
                          variant="outlined"
                          size="large"
                          onClick={clearSearch}
                          sx={{
                            borderRadius: '16px',
                            px: 6,
                            py: 2,
                            fontSize: '16px',
                            fontWeight: 600,
                            minWidth: '150px',
                            borderColor: 'rgba(102, 126, 234, 0.3)',
                            color: '#667eea',
                            borderWidth: '2px',
                            '&:hover': {
                              borderColor: '#667eea',
                              backgroundColor: 'rgba(102, 126, 234, 0.05)',
                              transform: 'translateY(-2px)',
                              borderWidth: '2px',
                            },
                          }}
                        >
                          Clear All
                        </Button>
                      )}

                      {hasData && (
                        <>
                          <Button
                            variant="text"
                            size="large"
                            onClick={() => setShowFilters(!showFilters)}
                            sx={{
                              borderRadius: '16px',
                              px: 4,
                              py: 2,
                              fontSize: '16px',
                              fontWeight: 600,
                              color: '#667eea',
                              '&:hover': {
                                backgroundColor: 'rgba(102, 126, 234, 0.05)',
                              },
                            }}
                            startIcon={<FilterList />}
                          >
                            {showFilters ? 'Hide Filters' : 'Show Filters'}
                          </Button>
                          
                          <Button
                            variant="outlined"
                            size="large"
                            onClick={exportResults}
                            sx={{
                              borderRadius: '16px',
                              px: 4,
                              py: 2,
                              fontSize: '16px',
                              fontWeight: 600,
                              borderColor: '#10b981',
                              color: '#10b981',
                              '&:hover': {
                                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                                borderColor: '#10b981',
                              },
                            }}
                            startIcon={<Download />}
                          >
                            Export CSV
                          </Button>

                          {hasData && (productNames.length > 0 || uniqueProductNames.length > 0) && (
                            <Button
                              variant="outlined"
                              size="large"
                              onClick={fetchTopImporters}
                              disabled={loadingTopImporters}
                              sx={{
                                borderRadius: '16px',
                                px: 4,
                                py: 2,
                                fontSize: '16px',
                                fontWeight: 600,
                                borderColor: '#f59e0b',
                                color: '#f59e0b',
                                '&:hover': {
                                  backgroundColor: 'rgba(245, 158, 11, 0.05)',
                                  borderColor: '#f59e0b',
                                },
                              }}
                              startIcon={loadingTopImporters ? <CircularProgress size={20} /> : <TrendingUp />}
                            >
                              {loadingTopImporters ? 'Loading...' : 'Top Importers'}
                            </Button>
                          )}

                          {hasData && (productNames.length > 0 || uniqueProductNames.length > 0) && (
                            <Button
                              variant="outlined"
                              size="large"
                              onClick={fetchTopSuppliers}
                              disabled={loadingTopSuppliers}
                              sx={{
                                borderRadius: '16px',
                                px: 4,
                                py: 2,
                                fontSize: '16px',
                                fontWeight: 600,
                                borderColor: '#8b5cf6',
                                color: '#8b5cf6',
                                '&:hover': {
                                  backgroundColor: 'rgba(139, 92, 246, 0.05)',
                                  borderColor: '#8b5cf6',
                                },
                              }}
                              startIcon={loadingTopSuppliers ? <CircularProgress size={20} /> : <Business />}
                            >
                              {loadingTopSuppliers ? 'Loading...' : 'Top Suppliers'}
                            </Button>
                          )}
                        </>
                      )}
                    </Box>
                  </Box>

                  {/* Additional Filters - Collapsible */}
                  {showFilters && (
                    <Fade in={showFilters} timeout={500}>
                      <Box>
                        <Divider sx={{ my: 4, borderColor: 'rgba(102, 126, 234, 0.1)', borderWidth: '1px' }} />

                        <Typography 
                          variant="h5" 
                          sx={{ 
                            mb: 1, 
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          🔧 Advanced Filters
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                          Refine your search results with these additional filters
                        </Typography>

                        <Grid container spacing={4}>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="HS Code"
                              variant="outlined"
                              value={hsCode}
                              onChange={(e) => setHsCode(e.target.value)}
                              placeholder="Enter HS code..."
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '16px',
                                  minHeight: '56px',
                                  fontSize: '16px',
                                  transition: 'all 0.3s ease',
                                  backgroundColor: 'rgba(99, 102, 241, 0.03)',
                                  border: '2px solid rgba(99, 102, 241, 0.1)',
                                  '&:hover': {
                                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                                    borderColor: 'rgba(99, 102, 241, 0.3)',
                                  },
                                  '&.Mui-focused': {
                                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                                    borderColor: '#6366f1',
                                  },
                                },
                                '& .MuiInputLabel-root': {
                                  fontSize: '16px',
                                  fontWeight: 500,
                                },
                              }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <QrCode sx={{ color: '#6366f1' }} />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="Importer ID"
                              variant="outlined"
                              value={importerId}
                              onChange={(e) => setImporterId(e.target.value)}
                              placeholder="Enter importer ID..."
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '16px',
                                  minHeight: '56px',
                                  fontSize: '16px',
                                  transition: 'all 0.3s ease',
                                  backgroundColor: 'rgba(168, 85, 247, 0.03)',
                                  border: '2px solid rgba(168, 85, 247, 0.1)',
                                  '&:hover': {
                                    backgroundColor: 'rgba(168, 85, 247, 0.08)',
                                    borderColor: 'rgba(168, 85, 247, 0.3)',
                                  },
                                  '&.Mui-focused': {
                                    backgroundColor: 'rgba(168, 85, 247, 0.08)',
                                    borderColor: '#a855f7',
                                  },
                                },
                                '& .MuiInputLabel-root': {
                                  fontSize: '16px',
                                  fontWeight: 500,
                                },
                              }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <PersonPin sx={{ color: '#a855f7' }} />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="Port Name"
                              variant="outlined"
                              value={portName}
                              onChange={(e) => setPortName(e.target.value)}
                              placeholder="Enter port name..."
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '16px',
                                  minHeight: '56px',
                                  fontSize: '16px',
                                  transition: 'all 0.3s ease',
                                  backgroundColor: 'rgba(59, 130, 246, 0.03)',
                                  border: '2px solid rgba(59, 130, 246, 0.1)',
                                  '&:hover': {
                                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                    borderColor: 'rgba(59, 130, 246, 0.3)',
                                  },
                                  '&.Mui-focused': {
                                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                    borderColor: '#3b82f6',
                                  },
                                },
                                '& .MuiInputLabel-root': {
                                  fontSize: '16px',
                                  fontWeight: 500,
                                },
                              }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <LocationOn sx={{ color: '#3b82f6' }} />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>
                        </Grid>

                        {/* Date Selection */}
                        <Box sx={{ mt: 5 }}>
                          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#667eea' }}>
                            📅 Date Range
                          </Typography>
                          
                          <FormControl component="fieldset" sx={{ mb: 3 }}>
                            <RadioGroup
                              row
                              value={dateMode}
                              onChange={(e) => setDateMode(e.target.value as 'single' | 'range')}
                              sx={{ gap: 4 }}
                            >
                              <FormControlLabel 
                                value="single" 
                                control={<Radio sx={{ color: '#667eea' }} />} 
                                label={<Typography variant="body1" fontWeight={500}>Single Date</Typography>}
                              />
                              <FormControlLabel 
                                value="range" 
                                control={<Radio sx={{ color: '#667eea' }} />} 
                                label={<Typography variant="body1" fontWeight={500}>Date Range</Typography>}
                              />
                            </RadioGroup>
                          </FormControl>

                          <Grid container spacing={4}>
                            {dateMode === 'single' ? (
                              <Grid item xs={12} md={6}>
                                <DatePicker
                                  label="Select Date"
                                  value={singleDate}
                                  onChange={(newValue) => setSingleDate(newValue)}
                                  slotProps={{
                                    textField: {
                                      fullWidth: true,
                                      sx: {
                                        '& .MuiOutlinedInput-root': {
                                          borderRadius: '16px',
                                          minHeight: '56px',
                                          fontSize: '16px',
                                          backgroundColor: 'rgba(244, 114, 182, 0.03)',
                                          border: '2px solid rgba(244, 114, 182, 0.1)',
                                          '&:hover': {
                                            backgroundColor: 'rgba(244, 114, 182, 0.08)',
                                            borderColor: 'rgba(244, 114, 182, 0.3)',
                                          },
                                          '&.Mui-focused': {
                                            backgroundColor: 'rgba(244, 114, 182, 0.08)',
                                            borderColor: '#f472b6',
                                          },
                                        },
                                        '& .MuiInputLabel-root': {
                                          fontSize: '16px',
                                          fontWeight: 500,
                                        },
                                      },
                                      InputProps: {
                                        startAdornment: (
                                          <InputAdornment position="start">
                                            <CalendarToday sx={{ color: '#f472b6' }} />
                                          </InputAdornment>
                                        ),
                                      }
                                    }
                                  }}
                                />
                              </Grid>
                            ) : (
                              <>
                                <Grid item xs={12} md={6}>
                                  <DatePicker
                                    label="Start Date"
                                    value={startDate}
                                    onChange={(newValue) => setStartDate(newValue)}
                                    slotProps={{
                                      textField: {
                                        fullWidth: true,
                                        sx: {
                                          '& .MuiOutlinedInput-root': {
                                            borderRadius: '16px',
                                            minHeight: '56px',
                                            fontSize: '16px',
                                            backgroundColor: 'rgba(244, 114, 182, 0.03)',
                                            border: '2px solid rgba(244, 114, 182, 0.1)',
                                            '&:hover': {
                                              backgroundColor: 'rgba(244, 114, 182, 0.08)',
                                              borderColor: 'rgba(244, 114, 182, 0.3)',
                                            },
                                            '&.Mui-focused': {
                                              backgroundColor: 'rgba(244, 114, 182, 0.08)',
                                              borderColor: '#f472b6',
                                            },
                                          },
                                          '& .MuiInputLabel-root': {
                                            fontSize: '16px',
                                            fontWeight: 500,
                                          },
                                        },
                                        InputProps: {
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <DateRange sx={{ color: '#f472b6' }} />
                                            </InputAdornment>
                                          ),
                                        }
                                      }
                                    }}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <DatePicker
                                    label="End Date"
                                    value={endDate}
                                    onChange={(newValue) => setEndDate(newValue)}
                                    minDate={startDate || undefined}
                                    slotProps={{
                                      textField: {
                                        fullWidth: true,
                                        sx: {
                                          '& .MuiOutlinedInput-root': {
                                            borderRadius: '16px',
                                            minHeight: '56px',
                                            fontSize: '16px',
                                            backgroundColor: 'rgba(244, 114, 182, 0.03)',
                                            border: '2px solid rgba(244, 114, 182, 0.1)',
                                            '&:hover': {
                                              backgroundColor: 'rgba(244, 114, 182, 0.08)',
                                              borderColor: 'rgba(244, 114, 182, 0.3)',
                                            },
                                            '&.Mui-focused': {
                                              backgroundColor: 'rgba(244, 114, 182, 0.08)',
                                              borderColor: '#f472b6',
                                            },
                                          },
                                          '& .MuiInputLabel-root': {
                                            fontSize: '16px',
                                            fontWeight: 500,
                                          },
                                        },
                                        InputProps: {
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <DateRange sx={{ color: '#f472b6' }} />
                                            </InputAdornment>
                                          ),
                                        }
                                      }
                                    }}
                                  />
                                </Grid>
                              </>
                            )}
                          </Grid>
                        </Box>
                      </Box>
                    </Fade>
                  )}

                  {/* Results Section */}
                  {hasData && searchResults && (
                    <Fade in={hasData} timeout={800}>
                      <Box sx={{ mt: 6 }}>
                        <Divider sx={{ mb: 4, borderColor: 'rgba(102, 126, 234, 0.1)', borderWidth: '1px' }} />
                        
                        <Paper
                          elevation={8}
                          sx={{ 
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%)',
                            border: '1px solid rgba(102, 126, 234, 0.1)',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Results Header */}
                          <Box sx={{ p: 4, pb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                              <Typography 
                                variant="h5" 
                                sx={{ 
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  backgroundClip: 'text',
                                }}
                              >
                                📊 Search Results
                              </Typography>
                              <Chip 
                                label={`${searchResults.count} total items`}
                                variant="outlined"
                                sx={{ 
                                  fontWeight: 600,
                                  borderColor: '#667eea',
                                  color: '#667eea',
                                  fontSize: '14px'
                                }}
                              />
                              {searchResults.error && (
                                <Chip 
                                  label="⚠️ Partial results"
                                  color="warning"
                                  variant="outlined"
                                  size="small"
                                />
                              )}
                            </Box>
                            
                            {searchResults.data.length > 0 && (
                              <Typography variant="body2" color="text.secondary">
                                Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, searchResults.data.length)} of {searchResults.data.length} results
                              </Typography>
                            )}
                          </Box>
                          
                          {/* Results Table */}
                          {searchResults.data.length > 0 ? (
                            <Box>
                              <TableContainer sx={{ maxHeight: '600px' }}>
                                <Table stickyHeader size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 100 }}>
                                        SYSTEM ID
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 110 }}>
                                        REG DATE
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 100 }}>
                                        MONTH YEAR
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 100 }}>
                                        HS CODE
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 80 }}>
                                        CHAPTER
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 200 }}>
                                        PRODUCT NAME
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 200 }}>
                                        UNIQUE PRODUCT NAME
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 100 }}>
                                        QUANTITY
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 80 }}>
                                        UNIT
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 120 }}>
                                        UNIT PRICE (USD)
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 140 }}>
                                        TOTAL VALUE (USD)
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 120 }}>
                                        IMPORTER ID
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 200 }}>
                                        IMPORTER NAME
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 120 }}>
                                        CITY
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 150 }}>
                                        CHA NUMBER
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 150 }}>
                                        TYPE
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 200 }}>
                                        SUPPLIER NAME
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 250 }}>
                                        SUPPLIER ADDRESS
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 120 }}>
                                        INDIAN PORT
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 120 }}>
                                        FOREIGN PORT
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 120 }}>
                                        EXCHANGE RATE
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 100 }}>
                                        DUTY
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderBottom: '2px solid rgba(102, 126, 234, 0.1)', minWidth: 100 }}>
                                        ACTIONS
                                      </TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {paginatedData.map((row, index) => (
                                      <TableRow 
                                        key={index}
                                        sx={{ 
                                          '&:hover': { 
                                            backgroundColor: 'rgba(102, 126, 234, 0.02)' 
                                          },
                                          '&:nth-of-type(even)': {
                                            backgroundColor: 'rgba(0, 0, 0, 0.01)'
                                          }
                                        }}
                                      >
                                        <TableCell sx={{ fontSize: '13px', fontFamily: 'monospace' }}>
                                          {row.system_id || '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px' }}>
                                          {row.reg_date ? new Date(row.reg_date).toLocaleDateString() : '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px' }}>
                                          {row.month_year || '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px', fontFamily: 'monospace' }}>
                                          {row.hs_code || '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px' }}>
                                          {row.chapter || '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px', maxWidth: 200 }}>
                                          <Box 
                                            title={row.product_name || '-'}
                                            sx={{ 
                                              overflow: 'hidden', 
                                              textOverflow: 'ellipsis', 
                                              whiteSpace: 'nowrap' 
                                            }}
                                          >
                                            {row.product_name && row.product_name.length > 30 
                                              ? `${row.product_name.substring(0, 30)}...` 
                                              : row.product_name || '-'
                                            }
                                          </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px', maxWidth: 200 }}>
                                          <Box 
                                            title={row.unique_product_name || '-'}
                                            sx={{ 
                                              overflow: 'hidden', 
                                              textOverflow: 'ellipsis', 
                                              whiteSpace: 'nowrap' 
                                            }}
                                          >
                                            {row.unique_product_name && row.unique_product_name.length > 30 
                                              ? `${row.unique_product_name.substring(0, 30)}...` 
                                              : row.unique_product_name || '-'
                                            }
                                          </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px', textAlign: 'right' }}>
                                          {row.quantity ? Number(row.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px' }}>
                                          {row.unit_quantity || '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px', textAlign: 'right' }}>
                                          {row.unit_price_usd ? `$${Number(row.unit_price_usd).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px', textAlign: 'right', fontWeight: 600 }}>
                                          {row.total_value_usd ? `$${Number(row.total_value_usd).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px', fontFamily: 'monospace' }}>
                                          {row.importer_id || '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px', maxWidth: 200 }}>
                                          <Box 
                                            title={row.true_importer_name || '-'}
                                            sx={{ 
                                              overflow: 'hidden', 
                                              textOverflow: 'ellipsis', 
                                              whiteSpace: 'nowrap' 
                                            }}
                                          >
                                            {row.true_importer_name && row.true_importer_name.length > 25 
                                              ? `${row.true_importer_name.substring(0, 25)}...` 
                                              : row.true_importer_name || '-'
                                            }
                                          </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px' }}>
                                          {row.city || '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px', maxWidth: 150 }}>
                                          <Box 
                                            title={row.cha_number || '-'}
                                            sx={{ 
                                              overflow: 'hidden', 
                                              textOverflow: 'ellipsis', 
                                              whiteSpace: 'nowrap' 
                                            }}
                                          >
                                            {row.cha_number && row.cha_number.length > 20 
                                              ? `${row.cha_number.substring(0, 20)}...` 
                                              : row.cha_number || '-'
                                            }
                                          </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px', maxWidth: 150 }}>
                                          <Box 
                                            title={row.type || '-'}
                                            sx={{ 
                                              overflow: 'hidden', 
                                              textOverflow: 'ellipsis', 
                                              whiteSpace: 'nowrap' 
                                            }}
                                          >
                                            {row.type && row.type.length > 20 
                                              ? `${row.type.substring(0, 20)}...` 
                                              : row.type || '-'
                                            }
                                          </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px', maxWidth: 200 }}>
                                          <Box 
                                            title={row.true_supplier_name || '-'}
                                            sx={{ 
                                              overflow: 'hidden', 
                                              textOverflow: 'ellipsis', 
                                              whiteSpace: 'nowrap' 
                                            }}
                                          >
                                            {row.true_supplier_name && row.true_supplier_name.length > 25 
                                              ? `${row.true_supplier_name.substring(0, 25)}...` 
                                              : row.true_supplier_name || '-'
                                            }
                                          </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px', maxWidth: 250 }}>
                                          <Box 
                                            title={row.supplier_address || '-'}
                                            sx={{ 
                                              overflow: 'hidden', 
                                              textOverflow: 'ellipsis', 
                                              whiteSpace: 'nowrap' 
                                            }}
                                          >
                                            {row.supplier_address && row.supplier_address.length > 30 
                                              ? `${row.supplier_address.substring(0, 30)}...` 
                                              : row.supplier_address || '-'
                                            }
                                          </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px' }}>
                                          {row.indian_port || '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px' }}>
                                          {row.foreign_port || '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px', textAlign: 'right' }}>
                                          {row.exchange_rate_usd ? Number(row.exchange_rate_usd).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '13px', textAlign: 'right' }}>
                                          {row.duty ? Number(row.duty).toLocaleString() : '-'}
                                        </TableCell>
                                        <TableCell>
                                          <Button
                                            size="small"
                                            startIcon={<Visibility />}
                                            onClick={() => {
                                              console.log('View details:', row);
                                              // Add modal or detailed view functionality here
                                            }}
                                            sx={{ 
                                              fontSize: '12px',
                                              color: '#667eea',
                                              '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.1)' }
                                            }}
                                          >
                                            View
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                              
                              {/* Pagination */}
                              {totalPages > 1 && (
                                <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                                  <Pagination 
                                    count={totalPages}
                                    page={currentPage}
                                    onChange={(_, page) => setCurrentPage(page)}
                                    color="primary"
                                    size="large"
                                    sx={{
                                      '& .MuiPaginationItem-root': {
                                        fontSize: '16px',
                                        fontWeight: 500,
                                      }
                                    }}
                                  />
                                </Box>
                              )}
                            </Box>
                          ) : (
                            <Box 
                              sx={{ 
                                textAlign: 'center', 
                                py: 8,
                                px: 4
                              }}
                            >
                              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                No results found
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Try adjusting your search criteria or filters
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      </Box>
                    </Fade>
                  )}

                  {/* Top Importers Section */}
                  {showTopImporters && topImporters && (
                    <Fade in={showTopImporters} timeout={800}>
                      <Box sx={{ mt: 4 }}>
                        <Paper
                          elevation={8}
                          sx={{ 
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, rgba(251, 191, 36, 0.03) 100%)',
                            border: '1px solid rgba(245, 158, 11, 0.1)',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Top Importers Header */}
                          <Box sx={{ p: 4, pb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                              <Typography 
                                variant="h5" 
                                sx={{ 
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  backgroundClip: 'text',
                                }}
                              >
                                📊 Top 10 Importers
                              </Typography>
                              <Chip 
                                label={`${topImporters.count} importers found`}
                                variant="outlined"
                                sx={{ 
                                  fontWeight: 600,
                                  borderColor: '#f59e0b',
                                  color: '#f59e0b',
                                  fontSize: '14px'
                                }}
                              />
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              Top importers by total value for: {topImporters.products_searched?.join(', ')}
                            </Typography>
                          </Box>
                          
                          {/* Top Importers Table */}
                          {topImporters.data.length > 0 ? (
                            <TableContainer sx={{ maxHeight: '500px' }}>
                              <Table stickyHeader size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.05)', borderBottom: '2px solid rgba(245, 158, 11, 0.1)', minWidth: 50 }}>
                                      RANK
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.05)', borderBottom: '2px solid rgba(245, 158, 11, 0.1)', minWidth: 250 }}>
                                      IMPORTER NAME
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.05)', borderBottom: '2px solid rgba(245, 158, 11, 0.1)', minWidth: 120 }}>
                                      IMPORTER ID
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.05)', borderBottom: '2px solid rgba(245, 158, 11, 0.1)', minWidth: 100 }}>
                                      CITY
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.05)', borderBottom: '2px solid rgba(245, 158, 11, 0.1)', minWidth: 140 }}>
                                      TOTAL VALUE (USD)
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.05)', borderBottom: '2px solid rgba(245, 158, 11, 0.1)', minWidth: 100 }}>
                                      SHIPMENTS
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.05)', borderBottom: '2px solid rgba(245, 158, 11, 0.1)', minWidth: 120 }}>
                                      TOTAL QUANTITY
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.05)', borderBottom: '2px solid rgba(245, 158, 11, 0.1)', minWidth: 120 }}>
                                      AVG UNIT PRICE
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.05)', borderBottom: '2px solid rgba(245, 158, 11, 0.1)', minWidth: 110 }}>
                                      FIRST IMPORT
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.05)', borderBottom: '2px solid rgba(245, 158, 11, 0.1)', minWidth: 110 }}>
                                      LAST IMPORT
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.05)', borderBottom: '2px solid rgba(245, 158, 11, 0.1)', minWidth: 100 }}>
                                      HS CODES
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.05)', borderBottom: '2px solid rgba(245, 158, 11, 0.1)', minWidth: 100 }}>
                                      COUNTRIES
                                    </TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {topImporters.data.map((importer, index) => (
                                    <TableRow 
                                      key={index}
                                      sx={{ 
                                        '&:hover': { 
                                          backgroundColor: 'rgba(245, 158, 11, 0.02)' 
                                        },
                                        '&:nth-of-type(even)': {
                                          backgroundColor: 'rgba(0, 0, 0, 0.01)'
                                        }
                                      }}
                                    >
                                      <TableCell sx={{ fontSize: '13px', fontWeight: 600 }}>
                                        <Chip 
                                          label={`#${index + 1}`}
                                          size="small"
                                          sx={{ 
                                            backgroundColor: index < 3 ? '#f59e0b' : 'rgba(245, 158, 11, 0.1)',
                                            color: index < 3 ? 'white' : '#f59e0b',
                                            fontWeight: 600
                                          }}
                                        />
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px', maxWidth: 250 }}>
                                        <Box 
                                          title={importer.true_importer_name || '-'}
                                          sx={{ 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis', 
                                            whiteSpace: 'nowrap',
                                            fontWeight: 500
                                          }}
                                        >
                                          {importer.true_importer_name && importer.true_importer_name.length > 35 
                                            ? `${importer.true_importer_name.substring(0, 35)}...` 
                                            : importer.true_importer_name || '-'
                                          }
                                        </Box>
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px', fontFamily: 'monospace' }}>
                                        {importer.importer_id || '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px' }}>
                                        {importer.city || '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                                        {importer.total_value_usd ? `$${Number(importer.total_value_usd).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px', textAlign: 'right' }}>
                                        {importer.total_shipments ? Number(importer.total_shipments).toLocaleString() : '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px', textAlign: 'right' }}>
                                        {importer.total_quantity ? Number(importer.total_quantity).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px', textAlign: 'right' }}>
                                        {importer.avg_unit_price_usd ? `$${Number(importer.avg_unit_price_usd).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px' }}>
                                        {importer.first_import_date ? new Date(importer.first_import_date).toLocaleDateString() : '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px' }}>
                                        {importer.last_import_date ? new Date(importer.last_import_date).toLocaleDateString() : '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px', textAlign: 'center' }}>
                                        <Chip 
                                          label={importer.unique_hs_codes || 0}
                                          size="small"
                                          variant="outlined"
                                          sx={{ 
                                            borderColor: '#f59e0b',
                                            color: '#f59e0b',
                                            fontSize: '12px'
                                          }}
                                        />
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px', textAlign: 'center' }}>
                                        <Chip 
                                          label={importer.unique_countries || 0}
                                          size="small"
                                          variant="outlined"
                                          sx={{ 
                                            borderColor: '#f59e0b',
                                            color: '#f59e0b',
                                            fontSize: '12px'
                                          }}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            <Box 
                              sx={{ 
                                textAlign: 'center', 
                                py: 6,
                                px: 4
                              }}
                            >
                              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                No importers found
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                No importer data available for the selected products
                              </Typography>
                            </Box>
                          )}
                        </Paper>

                        {/* Add the Chart Component */}
                        <Box sx={{ mt: 4 }}>
                          <ImporterChart 
                            data={topImporters.data} 
                            products_searched={topImporters.products_searched || []}
                          />
                        </Box>
                      </Box>
                    </Fade>
                  )}

                  {/* Top Suppliers Section */}
                  {showTopSuppliers && topSuppliers && (
                    <Fade in={showTopSuppliers} timeout={800}>
                      <Box sx={{ mt: 4 }}>
                        <Paper 
                          elevation={3} 
                          sx={{ 
                            p: 4, 
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, #f3f4f6 0%, #ffffff 100%)',
                            border: '1px solid rgba(139, 92, 246, 0.1)',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <Business sx={{ color: '#8b5cf6', mr: 2, fontSize: 32 }} />
                            <Box>
                              <Typography 
                                variant="h4" 
                                sx={{ 
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  backgroundClip: 'text',
                                  mb: 1
                                }}
                              >
                                🏭 Top Suppliers
                              </Typography>
                              <Typography variant="body1" color="text.secondary">
                                Leading suppliers for {topSuppliers.products_searched?.join(', ')} ({topSuppliers.count} suppliers found)
                              </Typography>
                            </Box>
                          </Box>

                          {topSuppliers.data.length > 0 ? (
                            <TableContainer 
                              sx={{ 
                                borderRadius: '16px',
                                border: '1px solid rgba(139, 92, 246, 0.1)',
                                maxHeight: '600px'
                              }}
                            >
                              <Table stickyHeader>
                                <TableHead>
                                  <TableRow sx={{ backgroundColor: 'rgba(139, 92, 246, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '14px', color: '#8b5cf6' }}>
                                      Supplier Name
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '14px', color: '#8b5cf6' }}>
                                      Country
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '14px', color: '#8b5cf6' }}>
                                      Total Value (USD)
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '14px', color: '#8b5cf6' }}>
                                      Shipments
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '14px', color: '#8b5cf6' }}>
                                      Quantity
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '14px', color: '#8b5cf6' }}>
                                      Avg Unit Price
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '14px', color: '#8b5cf6' }}>
                                      First Export
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '14px', color: '#8b5cf6' }}>
                                      Last Export
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '14px', color: '#8b5cf6', textAlign: 'center' }}>
                                      HS Codes
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '14px', color: '#8b5cf6', textAlign: 'center' }}>
                                      Importers
                                    </TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {topSuppliers.data.map((supplier, index) => (
                                    <TableRow 
                                      key={index}
                                      sx={{ 
                                        '&:hover': { 
                                          backgroundColor: 'rgba(139, 92, 246, 0.05)',
                                          transform: 'scale(1.01)',
                                          transition: 'all 0.2s ease-in-out'
                                        },
                                        '&:nth-of-type(odd)': {
                                          backgroundColor: 'rgba(139, 92, 246, 0.02)'
                                        }
                                      }}
                                    >
                                      <TableCell sx={{ fontSize: '13px', fontWeight: 600 }}>
                                        {supplier.true_supplier_name || supplier.supplier_name || '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px' }}>
                                        <Chip 
                                          label={supplier.origin_country || 'Unknown'}
                                          size="small"
                                          sx={{ 
                                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                            color: '#8b5cf6',
                                            fontSize: '12px'
                                          }}
                                        />
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                                        {supplier.total_value_usd ? `$${Number(supplier.total_value_usd).toLocaleString()}` : '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px' }}>
                                        {supplier.total_shipments?.toLocaleString() || '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px' }}>
                                        {supplier.total_quantity ? Number(supplier.total_quantity).toLocaleString() : '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px' }}>
                                        {supplier.avg_unit_price_usd ? `$${Number(supplier.avg_unit_price_usd).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px' }}>
                                        {supplier.first_export_date ? new Date(supplier.first_export_date).toLocaleDateString() : '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px' }}>
                                        {supplier.last_export_date ? new Date(supplier.last_export_date).toLocaleDateString() : '-'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '13px', textAlign: 'center' }}>
                                        <Chip 
                                          label={supplier.unique_hs_codes || 0}
                                          size="small"
                                          variant="outlined"
                                          sx={{ 
                                            borderColor: '#8b5cf6',
                                            color: '#8b5cf6',
                                            fontSize: '12px'
                                          }}
                                        />
                                      </TableCell>
                                                                           <TableCell sx={{ fontSize: '13px', textAlign: 'center' }}>
                                        <Chip 
                                          label={supplier.unique_importers || 0}
                                          size="small"
                                          variant="outlined"
                                          sx={{ 
                                            borderColor: '#8b5cf6',
                                            color: '#8b5cf6',
                                            fontSize: '12px'
                                          }}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            <Box 
                              sx={{ 
                                textAlign: 'center', 
                                py: 6,
                                px: 4
                              }}
                            >
                              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                No suppliers found
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                No supplier data available for the selected products
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      </Box>
                    </Fade>
                  )}

                  {/* ... rest of existing code ... */}
                </CardContent>
              </Card>
            </Box>
          </Fade>
        </Container>
      </Box>
    </LocalizationProvider>
  );
}

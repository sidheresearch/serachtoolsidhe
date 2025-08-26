// hooks/useDebouncedSuggestions.ts
import { useState, useEffect, useRef } from 'react';
import { tradeAPI } from '../utils/api';

interface UseDebouncedSuggestionsProps {
  query: string;
  searchType: 'product_name' | 'unique_product_name' | 'entity';
  delay?: number;
  minLength?: number;
}

export const useDebouncedSuggestions = ({
  query,
  searchType,
  delay = 300,
  minLength = 2
}: UseDebouncedSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear suggestions if query is too short
    if (!query || query.length < minLength) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    const fetchSuggestions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await tradeAPI.getFuzzySuggestions(query, searchType, 10);
        
        // Only update if this request wasn't aborted
        if (!abortControllerRef.current?.signal.aborted) {
          setSuggestions(response.suggestions);
        }
      } catch (err) {
        if (!abortControllerRef.current?.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
          setSuggestions([]);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(fetchSuggestions, delay);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, searchType, delay, minLength]);

  return { suggestions, isLoading, error };
};
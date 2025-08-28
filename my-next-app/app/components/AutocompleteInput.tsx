// components/AutocompleteInput.tsx
import React, { useState } from 'react';
import {
  TextField,
  Autocomplete,
  CircularProgress,
  InputAdornment,
  Chip,
  Box,
  Typography
} from '@mui/material';
import { useDebouncedSuggestions } from '../hooks/useDebouncedSuggestions';

interface AutocompleteInputProps {
  label: string;
  placeholder: string;
  searchType: 'product_name' | 'unique_product_name' | 'entity';
  value: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  sx?: Record<string, unknown>;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  placeholder,
  searchType,
  value,
  onChange,
  disabled = false,
  icon,
  sx
}) => {
  const [inputValue, setInputValue] = useState('');
  const { suggestions, isLoading, error } = useDebouncedSuggestions({
    query: inputValue,
    searchType,
    delay: 300,
    minLength: 2
  });

  const handleChange = (event: React.SyntheticEvent, newValue: string[]) => {
    onChange(newValue);
  };

  const handleInputChange = (event: React.SyntheticEvent, newInputValue: string) => {
    setInputValue(newInputValue);
  };

  return (
    <Autocomplete
      multiple
      freeSolo
      options={suggestions}
      value={value}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      disabled={disabled}
      loading={isLoading}
      filterOptions={(options) => options} // Don't filter, use API suggestions
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip
            label={option.length > 50 ? `${option.substring(0, 50)}...` : option}
            {...getTagProps({ index })}
            size="small"
            sx={{
              backgroundColor: 'primary.light',
              color: 'primary.contrastText',
              '& .MuiChip-deleteIcon': {
                color: 'primary.contrastText',
              },
            }}
          />
        ))
      }
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option}>
          <Typography variant="body2" sx={{ 
            wordBreak: 'break-word',
            fontSize: '0.875rem',
            lineHeight: 1.4
          }}>
            {option.length > 80 ? `${option.substring(0, 80)}...` : option}
          </Typography>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={value.length === 0 ? placeholder : ''}
          variant="outlined"
          error={!!error}
          helperText={error}
          fullWidth
          sx={sx}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                {icon && (
                  <InputAdornment position="start">
                    {icon}
                  </InputAdornment>
                )}
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <React.Fragment>
                {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
      sx={{
        width: '100%',
        minWidth: '400px',
        '& .MuiOutlinedInput-root': {
          minWidth: '100%',
        },
        '& .MuiAutocomplete-inputRoot': {
          minWidth: '400px',
          width: '100%',
        },
        '& .MuiAutocomplete-listbox': {
          maxHeight: '300px',
          minWidth: '400px',
        },
        '& .MuiAutocomplete-option': {
          padding: '12px 16px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
        ...sx,
      }}
    />
  );
};
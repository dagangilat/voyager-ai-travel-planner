import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchDestinations, loadDestinations } from "@/services/destinationCache";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LocationSearchInput({ 
  value, 
  onChange, 
  onDisplayChange,
  label, 
  placeholder = "Search cities, airports...",
  id,
  includeAirportCodes = true
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchTimeout = useRef(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const justSelected = useRef(false);

  useEffect(() => {
    if (!justSelected.current && value) {
      // If value looks like a display name (not a Place ID), use it as display
      if (!value.startsWith('ChIJ')) {
        setSearchQuery(value);
        setDisplayValue(value);
      }
    }
    justSelected.current = false;
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current && !inputRef.current.contains(event.target) &&
        suggestionsRef.current && !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocations = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      // Ensure destinations are loaded
      await loadDestinations();
      
      // Search client-side (instant!)
      const results = searchDestinations(query, 10);
      
      console.log(`Found ${results.length} results instantly for:`, query);
      
      // Transform results to match expected format
      const validLocations = results.map(place => ({
        place_id: place.id,
        name: place.name,
        formatted_address: place.formatted_address,
        code: place.id,
        location: place.location,
        source: place.source
      })).filter(loc => loc.name);

      setSuggestions(validLocations);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Search error:", error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setDisplayValue(query);
    setShowSuggestions(true);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Even faster debounce - 50ms for instant feel
    searchTimeout.current = setTimeout(() => {
      searchLocations(query);
    }, 50);
  };

  const handleSelectSuggestion = (suggestion) => {
    // The suggestion.name is already in the format "City, Country [CODE]"
    const displayName = suggestion.name;
    const code = suggestion.code;
    const location = suggestion.location;
    
    justSelected.current = true;
    setSearchQuery(displayName);
    setDisplayValue(displayName);
    
    if (onDisplayChange) {
      onDisplayChange(displayName);
    }
    
    // Pass code, display name, and location to parent
    onChange(code, displayName, location);
    
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : (prev === -1 ? 0 : prev)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div className="space-y-2 relative">
      {label && (
        <Label htmlFor={id} className="text-sm font-semibold text-gray-700">
          {label}
        </Label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 || searchQuery.length >= 2) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className="border-gray-200 focus:border-blue-500 transition-colors pr-10"
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          ) : (
            <Navigation className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto">
              {suggestions.map((suggestion, index) => {
                return (
                  <button
                    key={suggestion.place_id || index}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectSuggestion(suggestion);
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left ${
                      selectedIndex === index ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {suggestion.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
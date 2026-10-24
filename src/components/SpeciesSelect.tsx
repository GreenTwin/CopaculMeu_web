import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TreePine, ChevronDown, Check, X, Plus, Sparkles, Loader2 } from 'lucide-react';
import type { SpeciesResponse } from '../types/tree';

interface SpeciesSelectProps {
  value: string;
  onChange: (value: string) => void;
  availableSpecies: SpeciesResponse[];
  isLoading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  required?: boolean;
}

function normalizeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getSpeciesLabels(species: SpeciesResponse): { common: string; scientific: string } {
  if (species.commonName && species.scientificName) {
    return { common: species.commonName, scientific: species.scientificName };
  }
  const match = species.name.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    return {
      scientific: match[1].trim(),
      common: match[2].trim(),
    };
  }
  return {
    common: species.commonName || species.name,
    scientific: species.scientificName || '',
  };
}

export const SpeciesSelect: React.FC<SpeciesSelectProps> = ({
  value,
  onChange,
  availableSpecies,
  isLoading = false,
  placeholder = 'Alege sau caută o specie...',
  autoFocus = false,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter species based on normalized search query (accent-insensitive)
  const filteredSpecies = useMemo(() => {
    const query = normalizeDiacritics(value.trim());
    if (!query) {
      return availableSpecies;
    }
    return availableSpecies.filter((s) => {
      const normName = normalizeDiacritics(s.name);
      const normCommon = s.commonName ? normalizeDiacritics(s.commonName) : '';
      const normSci = s.scientificName ? normalizeDiacritics(s.scientificName) : '';
      const normAliases = s.aliases ? normalizeDiacritics(s.aliases) : '';

      return (
        normName.includes(query) ||
        normCommon.includes(query) ||
        normSci.includes(query) ||
        normAliases.includes(query)
      );
    });
  }, [availableSpecies, value]);

  // Check if current value matches an existing species in the catalog
  const hasExactMatch = useMemo(() => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return true;
    return availableSpecies.some(
      (s) =>
        s.name.toLowerCase() === trimmed ||
        (s.commonName && s.commonName.toLowerCase() === trimmed) ||
        (s.scientificName && s.scientificName.toLowerCase() === trimmed)
    );
  }, [availableSpecies, value]);

  const handleSelect = (speciesName: string) => {
    onChange(speciesName);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    const totalItems = filteredSpecies.length + (!hasExactMatch && value.trim().length > 1 ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 >= totalItems ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 < 0 ? totalItems - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0) {
        e.preventDefault();
        if (highlightedIndex < filteredSpecies.length) {
          handleSelect(filteredSpecies[highlightedIndex].name);
        } else if (!hasExactMatch && value.trim()) {
          handleSelect(value.trim());
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className="species-select-container" ref={containerRef}>
      <div className={`species-select-control ${isOpen ? 'is-focused' : ''}`}>
        <div className="species-control-icon">
          <TreePine size={18} color="#059669" />
        </div>

        <input
          ref={inputRef}
          type="text"
          className="species-select-input"
          value={value}
          placeholder={isLoading ? 'Se încarcă catalogul de specii...' : placeholder}
          required={required}
          autoFocus={autoFocus}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />

        <div className="species-control-actions">
          {isLoading && (
            <div className="species-loading-icon" title="Se încarcă speciile">
              <Loader2 size={15} className="rotating" color="#059669" />
            </div>
          )}

          {value && (
            <button
              type="button"
              className="species-action-btn clear-btn"
              onClick={handleClear}
              title="Șterge selecția"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="button"
            className={`species-action-btn toggle-btn ${isOpen ? 'open' : ''}`}
            onClick={() => {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            title={isOpen ? 'Închide lista' : 'Deschide lista speciilor'}
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown Menu respecting the app's eco-theme */}
      {isOpen && (
        <div className="species-dropdown-popup">
          <div className="species-dropdown-header">
            <span className="dropdown-title">
              <Sparkles size={13} color="#059669" />
              <span>Catalog Specii Timișoara</span>
            </span>
            <span className="dropdown-counter">
              {filteredSpecies.length} {filteredSpecies.length === 1 ? 'specie' : 'specii'}
            </span>
          </div>

          <ul className="species-dropdown-list" ref={listRef}>
            {filteredSpecies.map((s, index) => {
              const { common, scientific } = getSpeciesLabels(s);
              const isSelected = value.trim().toLowerCase() === s.name.toLowerCase();
              const isHighlighted = highlightedIndex === index;

              return (
                <li
                  key={s.id}
                  className={`species-option-item ${isSelected ? 'selected' : ''} ${
                    isHighlighted ? 'highlighted' : ''
                  }`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(s.name)}
                >
                  <div className="species-option-avatar">
                    <TreePine size={15} />
                  </div>

                  <div className="species-option-text">
                    <div className="species-common-name">{common}</div>
                    {scientific && <div className="species-scientific-name">{scientific}</div>}
                  </div>

                  {isSelected && (
                    <div className="species-option-check">
                      <Check size={16} color="#059669" />
                    </div>
                  )}
                </li>
              );
            })}

            {/* Custom Species Option if not an exact match */}
            {!hasExactMatch && value.trim().length > 1 && (
              <li
                className={`species-option-item custom-option ${
                  highlightedIndex === filteredSpecies.length ? 'highlighted' : ''
                }`}
                onMouseEnter={() => setHighlightedIndex(filteredSpecies.length)}
                onClick={() => handleSelect(value.trim())}
              >
                <div className="species-option-avatar custom">
                  <Plus size={15} color="#047857" />
                </div>
                <div className="species-option-text">
                  <div className="species-common-name">
                    Folosește <strong>„{value.trim()}”</strong>
                  </div>
                  <div className="species-scientific-name">Specie nouă / nestandardizată</div>
                </div>
              </li>
            )}

            {filteredSpecies.length === 0 && hasExactMatch && (
              <li className="species-empty-notice">
                Nu am găsit specii conform căutării. Tastează un nume nou pentru a-l propune.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

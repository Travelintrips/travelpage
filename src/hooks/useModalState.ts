import { useState, useEffect } from 'react';

/**
 * Custom hook to preserve modal state across tab switches and potential remounts
 * Uses sessionStorage to persist modal state during session
 */
export function useModalState(modalKey: string, defaultOpen: boolean = false) {
  const storageKey = `modal_${modalKey}`;
  
  // Initialize state from sessionStorage or default
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return defaultOpen;
    
    const stored = sessionStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : defaultOpen;
  });

  // Persist state changes to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(isOpen));
  }, [isOpen, storageKey]);

  // Clean up sessionStorage when modal is closed
  const closeModal = () => {
    setIsOpen(false);
    sessionStorage.removeItem(storageKey);
  };

  const openModal = () => {
    setIsOpen(true);
  };

  const toggleModal = () => {
    setIsOpen(prev => !prev);
  };

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
    setIsOpen
  };
}

/**
 * Custom hook to preserve form state across tab switches and potential remounts
 * Uses sessionStorage to persist form data during session
 */
export function useFormState<T extends Record<string, any>>(
  formKey: string, 
  initialState: T
) {
  const storageKey = `form_${formKey}`;
  
  // Initialize state from sessionStorage or initial state
  const [formData, setFormData] = useState<T>(() => {
    if (typeof window === 'undefined') return initialState;
    
    const stored = sessionStorage.getItem(storageKey);
    return stored ? { ...initialState, ...JSON.parse(stored) } : initialState;
  });

  // Persist state changes to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(formData));
  }, [formData, storageKey]);

  // Clear form data from sessionStorage
  const clearFormData = () => {
    setFormData(initialState);
    sessionStorage.removeItem(storageKey);
  };

  // Update specific field
  const updateField = (field: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return {
    formData,
    setFormData,
    updateField,
    clearFormData
  };
}

/**
 * Custom hook to preserve any component state across tab switches
 * Generic utility for state persistence
 */
export function usePersistedState<T>(
  key: string, 
  defaultValue: T,
  storage: 'localStorage' | 'sessionStorage' = 'sessionStorage'
) {
  const storageObject = storage === 'localStorage' ? localStorage : sessionStorage;
  
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    
    try {
      const stored = storageObject.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.warn(`Error parsing stored state for key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      storageObject.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Error storing state for key "${key}":`, error);
    }
  }, [key, state, storageObject]);

  const clearState = () => {
    setState(defaultValue);
    storageObject.removeItem(key);
  };

  return [state, setState, clearState] as const;
}
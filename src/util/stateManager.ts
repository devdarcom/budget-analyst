import { BudgetParams, IterationData, ChartData } from "@/types/budget";

export interface SavedState {
  id: string;
  name: string;
  date: string;
  budgetParams: BudgetParams;
  iterations: IterationData[];
  chartData: ChartData[];
}

export interface AppState {
  budgetParams: BudgetParams;
  iterations: IterationData[];
  chartData: ChartData[];
}

const STORAGE_KEY = 'budget-app-saved-states';

// Get all saved states from local storage
export const getSavedStates = (): SavedState[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const savedStatesJson = localStorage.getItem(STORAGE_KEY);
    if (!savedStatesJson) return [];
    
    return JSON.parse(savedStatesJson);
  } catch (error) {
    console.error('Error loading saved states:', error);
    return [];
  }
};

// Save current state to local storage
export const saveState = (name: string, state: AppState): SavedState => {
  const savedStates = getSavedStates();
  
  const newState: SavedState = {
    id: Date.now().toString(),
    name,
    date: new Date().toISOString(),
    budgetParams: state.budgetParams,
    iterations: state.iterations,
    chartData: state.chartData
  };
  
  savedStates.push(newState);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedStates));
    return newState;
  } catch (error) {
    console.error('Error saving state:', error);
    throw new Error('Failed to save state');
  }
};

// Load a saved state by ID
export const loadState = (id: string): AppState | null => {
  const savedStates = getSavedStates();
  const state = savedStates.find(state => state.id === id);
  
  if (!state) return null;
  
  return {
    budgetParams: state.budgetParams,
    iterations: state.iterations,
    chartData: state.chartData
  };
};

// Delete a saved state by ID
export const deleteState = (id: string): boolean => {
  const savedStates = getSavedStates();
  const filteredStates = savedStates.filter(state => state.id !== id);
  
  if (filteredStates.length === savedStates.length) {
    return false; // No state was deleted
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredStates));
    return true;
  } catch (error) {
    console.error('Error deleting state:', error);
    return false;
  }
};
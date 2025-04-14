import { BudgetParams, IterationData, ChartData } from "@/types/budget";

export interface SavedState {
  id: string;
  name: string;
  date: string;
  budgetParams: BudgetParams;
  iterations: IterationData[];
  chartData: ChartData[];
  visibleChartItems?: string[];
}

export interface AppState {
  budgetParams: BudgetParams;
  iterations: IterationData[];
  chartData: ChartData[];
  visibleChartItems?: string[];
}

const STORAGE_KEY = 'budget-app-saved-states';

// Get all saved states from local storage and database
export const getSavedStates = async (userId?: string): Promise<SavedState[]> => {
  if (typeof window === 'undefined') return [];
  
  try {
    // Get states from local storage
    const savedStatesJson = localStorage.getItem(STORAGE_KEY);
    let localStates: SavedState[] = [];
    
    if (savedStatesJson) {
      localStates = JSON.parse(savedStatesJson);
    }
    
    // If userId is provided, also fetch states from the database
    if (userId) {
      try {
        const response = await fetch(`/api/states/get?userId=${userId}`);
        
        if (response.ok) {
          const dbStates = await response.json();
          
          // Convert database states to the expected format
          const formattedDbStates = dbStates.map((state: any) => ({
            id: state.id,
            name: state.name,
            date: state.date,
            ...state.data
          }));
          
          // Combine local and database states
          return [...localStates, ...formattedDbStates];
        }
      } catch (dbError) {
        console.error('Error fetching states from database:', dbError);
      }
    }
    
    return localStates;
  } catch (error) {
    console.error('Error loading saved states:', error);
    return [];
  }
};

// Save current state to local storage and database
export const saveState = async (name: string, state: AppState, userId?: string): Promise<SavedState> => {
  const savedStates = await getSavedStates();
  
  const newState: SavedState = {
    id: Date.now().toString(),
    name,
    date: new Date().toISOString(),
    budgetParams: state.budgetParams,
    iterations: state.iterations,
    chartData: state.chartData,
    visibleChartItems: state.visibleChartItems
  };
  
  // Save to local storage
  try {
    const updatedStates = [...savedStates, newState];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStates));
    
    // If userId is provided, also save to database
    if (userId) {
      try {
        const response = await fetch('/api/states/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            name,
            data: {
              budgetParams: state.budgetParams,
              iterations: state.iterations,
              chartData: state.chartData,
              visibleChartItems: state.visibleChartItems
            }
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.id) {
            newState.id = result.id; // Update with the database ID
          }
        } else {
          console.error('Failed to save state to database:', await response.text());
        }
      } catch (dbError) {
        console.error('Error saving state to database:', dbError);
      }
    }
    
    return newState;
  } catch (error) {
    console.error('Error saving state:', error);
    throw new Error('Failed to save state');
  }
};

// Load a saved state by ID
export const loadState = async (id: string, userId?: string): Promise<AppState | null> => {
  const savedStates = await getSavedStates(userId);
  const state = savedStates.find(state => state.id === id);
  
  if (!state) return null;
  
  return {
    budgetParams: state.budgetParams,
    iterations: state.iterations,
    chartData: state.chartData,
    visibleChartItems: state.visibleChartItems
  };
};

// Delete a saved state by ID
export const deleteState = async (id: string, userId?: string): Promise<boolean> => {
  const savedStates = await getSavedStates();
  const filteredStates = savedStates.filter(state => state.id !== id);
  
  if (filteredStates.length === savedStates.length) {
    return false; // No state was deleted
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredStates));
    
    // If userId is provided, also delete from database
    if (userId) {
      try {
        const response = await fetch(`/api/states/delete?id=${id}&userId=${userId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          console.error('Failed to delete state from database:', await response.text());
        }
      } catch (dbError) {
        console.error('Error deleting state from database:', dbError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting state:', error);
    return false;
  }
};
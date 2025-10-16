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

const getAuthHeader = async () => {
  if (typeof window === 'undefined') return null;

  const { supabase } = await import('@/lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    return `Bearer ${session.access_token}`;
  }

  return null;
};

export const getSavedStates = async (userId?: string): Promise<SavedState[]> => {
  if (typeof window === 'undefined') return [];

  try {
    const savedStatesJson = localStorage.getItem(STORAGE_KEY);
    let localStates: SavedState[] = [];

    if (savedStatesJson) {
      localStates = JSON.parse(savedStatesJson);
    }

    if (userId) {
      try {
        const authHeader = await getAuthHeader();
        if (!authHeader) {
          return localStates;
        }

        const response = await fetch('/api/states/get', {
          headers: {
            'Authorization': authHeader,
          },
        });

        if (response.ok) {
          const dbStates = await response.json();

          const formattedDbStates = dbStates.map((state: any) => ({
            id: state.id,
            name: state.name,
            date: state.date,
            ...state.data
          }));

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
    
    if (userId) {
      try {
        const authHeader = await getAuthHeader();
        if (authHeader) {
          const response = await fetch('/api/states/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
            },
            body: JSON.stringify({
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
              newState.id = result.id;
            }
          } else {
            console.error('Failed to save state to database:', await response.text());
          }
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
  try {
    // Get current saved states
    const savedStates = await getSavedStates();
    const filteredStates = savedStates.filter(state => state.id !== id);
    
    // Update local storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredStates));
    
    if (userId) {
      try {
        const authHeader = await getAuthHeader();
        if (authHeader) {
          const response = await fetch(`/api/states/delete?id=${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to delete state from database:', errorText);
            return false;
          }
        }
      } catch (dbError) {
        console.error('Error deleting state from database:', dbError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting state:', error);
    return false;
  }
};

// Clean up old saved states from the database (states older than 30 days)
export const cleanupDatabase = async (): Promise<{ success: boolean, count: number }> => {
  try {
    const response = await fetch('/api/states/cleanup', {
      method: 'POST',
    });
    
    if (response.ok) {
      const result = await response.json();
      return { 
        success: true, 
        count: result.count || 0 
      };
    } else {
      console.error('Failed to clean up database:', await response.text());
      return { success: false, count: 0 };
    }
  } catch (error) {
    console.error('Error cleaning up database:', error);
    return { success: false, count: 0 };
  }
};
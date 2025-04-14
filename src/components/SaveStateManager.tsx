import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { saveState, getSavedStates, loadState, deleteState, cleanupDatabase, SavedState, AppState } from '@/util/stateManager';
import { useAuth } from '@/contexts/AuthContext';

interface SaveStateManagerProps {
  currentState: AppState;
  onLoadState: (state: AppState) => void;
  onGeneratePDF: () => void;
}

export default function SaveStateManager({ currentState, onLoadState, onGeneratePDF }: SaveStateManagerProps) {
  const { isAuthenticated, user } = useAuth();
  const [savedStates, setSavedStates] = useState<SavedState[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [selectedState, setSelectedState] = useState<SavedState | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved states from local storage and database
  useEffect(() => {
    if (isAuthenticated) {
      const fetchSavedStates = async () => {
        setIsLoading(true);
        try {
          // Run database cleanup once (as requested by user)
          try {
            await cleanupDatabase();
            console.log('Database cleanup completed');
          } catch (cleanupError) {
            console.error('Error during database cleanup:', cleanupError);
          }
          
          const states = await getSavedStates(user?.id);
          setSavedStates(states);
        } catch (error) {
          console.error('Error fetching saved states:', error);
          toast.error('Failed to load saved states');
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchSavedStates();
    }
  }, [isAuthenticated, user]);

  // Handle saving current state
  const handleSaveState = async () => {
    if (!saveName.trim()) {
      toast.error('Please enter a name for this save');
      return;
    }

    setIsLoading(true);
    try {
      const newState = await saveState(saveName, currentState, user?.id);
      setSavedStates(prev => [...prev, newState]);
      setSaveName('');
      setSaveDialogOpen(false);
      toast.success('State saved successfully');
    } catch (error) {
      console.error('Error saving state:', error);
      toast.error('Failed to save state');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle loading a saved state
  const handleLoadState = async (id: string) => {
    setIsLoading(true);
    try {
      const state = await loadState(id, user?.id);
      if (state) {
        onLoadState(state);
        setLoadDialogOpen(false);
        toast.success('State loaded successfully');
      } else {
        toast.error('Failed to load state');
      }
    } catch (error) {
      console.error('Error loading state:', error);
      toast.error('Failed to load state');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting a saved state
  const handleDeleteState = async () => {
    if (!selectedState) return;
    
    // Store the ID before deletion to filter the array later
    const stateIdToDelete = selectedState.id;
    
    setIsLoading(true);
    try {
      const success = await deleteState(stateIdToDelete, user?.id);
      if (success) {
        // Close the dialog first to prevent focus issues
        setDeleteDialogOpen(false);
        
        // Use setTimeout to ensure the dialog is fully closed before updating state
        setTimeout(() => {
          setSavedStates(prev => prev.filter(state => state.id !== stateIdToDelete));
          setSelectedState(null);
          toast.success('State deleted successfully');
        }, 100);
      } else {
        toast.error('Failed to delete state');
      }
    } catch (error) {
      console.error('Error deleting state:', error);
      toast.error('Failed to delete state');
    } finally {
      setIsLoading(false);
    }
  };
  


  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      // Check if the date string is valid
      if (!dateString || dateString === 'Z') {
        return 'Invalid date';
      }
      
      // Ensure the date string is properly formatted
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      // Format the date using toLocaleString
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Generate PDF Button - Always visible */}
      <Button 
        onClick={onGeneratePDF}
        className="bg-primary hover:bg-primary/90"
      >
        Generate PDF Report
      </Button>
      
      {/* Save/Load State functionality - Only visible when authenticated */}
      {isAuthenticated && (
        <>
          {/* Save State Dialog */}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={isLoading}>Save State</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Current State</DialogTitle>
                <DialogDescription>
                  Save the current budget parameters, iterations, and visualization for later use.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <label htmlFor="save-name" className="text-sm font-medium block mb-2">
                  Save Name
                </label>
                <Input
                  id="save-name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="My Budget Scenario"
                  disabled={isLoading}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button onClick={handleSaveState} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Load State Dialog */}
          <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={isLoading}>Load State</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Load Saved State</DialogTitle>
                <DialogDescription>
                  Select a previously saved state to load.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 max-h-[400px] overflow-y-auto">
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-4">
                    Loading saved states...
                  </p>
                ) : savedStates.length > 0 ? (
                  <div className="space-y-2">
                    {savedStates.map((state) => (
                      <div
                        key={state.id}
                        className="p-3 border rounded-md flex justify-between items-center hover:bg-accent cursor-pointer"
                        onClick={() => handleLoadState(state.id)}
                      >
                        <div>
                          <h4 className="font-medium">{state.name}</h4>
                          <p className="text-sm text-muted-foreground">{formatDate(state.date)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // First close the load dialog to prevent focus issues
                            setLoadDialogOpen(false);
                            // Use setTimeout to ensure the load dialog is closed before opening delete dialog
                            setTimeout(() => {
                              setSelectedState(state);
                              setDeleteDialogOpen(true);
                            }, 100);
                          }}
                          disabled={isLoading}
                        >
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No saved states found.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLoadDialogOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog 
            open={deleteDialogOpen} 
            onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              // If dialog is closing and we're not in the middle of an operation,
              // ensure we reset the selected state to avoid focus issues
              if (!open && !isLoading) {
                // Use setTimeout to ensure this happens after the dialog closing animation
                setTimeout(() => {
                  setSelectedState(null);
                }, 100);
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Saved State</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{selectedState?.name}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteState} disabled={isLoading}>
                  {isLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>



          {/* Mobile-friendly dropdown for smaller screens */}
          <div className="block md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isLoading}>Manage States</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSaveDialogOpen(true)} disabled={isLoading}>
                  Save State
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLoadDialogOpen(true)} disabled={isLoading}>
                  Load State
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onGeneratePDF} disabled={isLoading}>
                  Generate PDF Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  );
}
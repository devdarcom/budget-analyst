import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { saveState, getSavedStates, loadState, deleteState, SavedState, AppState } from '@/util/stateManager';

interface SaveStateManagerProps {
  currentState: AppState;
  onLoadState: (state: AppState) => void;
  onGeneratePDF: () => void;
}

export default function SaveStateManager({ currentState, onLoadState, onGeneratePDF }: SaveStateManagerProps) {
  const [savedStates, setSavedStates] = useState<SavedState[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [selectedState, setSelectedState] = useState<SavedState | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Load saved states from local storage
  useEffect(() => {
    setSavedStates(getSavedStates());
  }, []);

  // Handle saving current state
  const handleSaveState = () => {
    if (!saveName.trim()) {
      toast.error('Please enter a name for this save');
      return;
    }

    try {
      const newState = saveState(saveName, currentState);
      setSavedStates([...savedStates, newState]);
      setSaveName('');
      setSaveDialogOpen(false);
      toast.success('State saved successfully');
    } catch (error) {
      toast.error('Failed to save state');
    }
  };

  // Handle loading a saved state
  const handleLoadState = (id: string) => {
    const state = loadState(id);
    if (state) {
      onLoadState(state);
      setLoadDialogOpen(false);
      toast.success('State loaded successfully');
    } else {
      toast.error('Failed to load state');
    }
  };

  // Handle deleting a saved state
  const handleDeleteState = () => {
    if (!selectedState) return;

    const success = deleteState(selectedState.id);
    if (success) {
      setSavedStates(savedStates.filter(state => state.id !== selectedState.id));
      setDeleteDialogOpen(false);
      setSelectedState(null);
      toast.success('State deleted successfully');
    } else {
      toast.error('Failed to delete state');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Generate PDF Button */}
      <Button 
        onClick={onGeneratePDF}
        className="bg-primary hover:bg-primary/90"
      >
        Generate PDF Report
      </Button>
      
      {/* Save State Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Save State</Button>
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
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveState}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load State Dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Load State</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Saved State</DialogTitle>
            <DialogDescription>
              Select a previously saved state to load.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[400px] overflow-y-auto">
            {savedStates.length > 0 ? (
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
                        setSelectedState(state);
                        setDeleteDialogOpen(true);
                      }}
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
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Saved State</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedState?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteState}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile-friendly dropdown for smaller screens */}
      <div className="block md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Manage States</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
              Save State
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLoadDialogOpen(true)}>
              Load State
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onGeneratePDF}>
              Generate PDF Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
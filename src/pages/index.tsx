import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, BarChart, ResponsiveContainer, Line, ComposedChart, ReferenceLine } from "recharts";
import * as RechartsPrimitive from "recharts";
import Papa from "papaparse";
import { toast } from "sonner";
import { generatePDFReport } from "@/util/pdfGenerator";
import { BudgetParams, IterationData, ChartData } from "@/types/budget";
import SaveStateManager from "@/components/SaveStateManager";
import { AppState } from "@/util/stateManager";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Component implementation

export default function Home() {
  // Reference for the chart component (used for PDF generation)
  const chartRef = useRef<HTMLDivElement>(null);
  // State for budget parameters
  const [budgetParams, setBudgetParams] = useState<BudgetParams>({
    costPerHour: 50,
    budgetSize: 100000,
    teamSize: 5,
    workingDaysPerIteration: 10,
    currency: "$"
  });

  // State for iteration data
  const [iterations, setIterations] = useState<IterationData[]>([]);
  const [newIteration, setNewIteration] = useState<IterationData>({
    iterationNumber: 1,
    iterationDays: 10,
    teamSize: 5,
    totalHours: 10 * 5 * 8 // Default: days * team size * 8 hours
  });
  
  // Flag to track if iterations have been pre-filled
  const [iterationsPreFilled, setIterationsPreFilled] = useState<boolean>(false);

  // State for chart data
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // State for chart visibility toggles
  const [visibleChartItems, setVisibleChartItems] = useState<string[]>([
    "standardCumulative", 
    "actualCumulative", 
    "individualCost"
  ]);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle budget parameter changes
  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Handle currency as a string, all other parameters as numbers
    if (name === 'currency') {
      setBudgetParams(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setBudgetParams(prev => {
        const updatedParams = {
          ...prev,
          [name]: parseFloat(value) || 0
        };
        return updatedParams;
      });
    }
    
    // Reset pre-filled flag to allow regeneration of iterations with new parameters
    // Only if there are no manually added iterations
    if (iterations.length === 0) {
      setIterationsPreFilled(false);
    }
  };

  // Handle new iteration input changes
  const handleIterationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    
    setNewIteration(prev => {
      const updated = {
        ...prev,
        [name]: numValue
      };
      
      // Auto-calculate total hours when days or team size changes
      // Only if we're not directly editing the totalHours field
      if (name !== 'totalHours' && (name === 'iterationDays' || name === 'teamSize')) {
        updated.totalHours = updated.iterationDays * updated.teamSize * 8;
      }
      
      return updated;
    });
  };

  // Add a new iteration
  const addIteration = () => {
    if (iterations.length >= 100) {
      toast.error("Maximum of 100 iterations allowed");
      return;
    }

    if (newIteration.iterationNumber <= 0 || newIteration.iterationDays <= 0 || newIteration.teamSize <= 0) {
      toast.error("All values must be greater than zero");
      return;
    }

    // Check if iteration number already exists
    if (iterations.some(it => it.iterationNumber === newIteration.iterationNumber)) {
      toast.error(`Iteration ${newIteration.iterationNumber} already exists`);
      return;
    }

    // Ensure totalHours is calculated if not set
    const iterationToAdd = { ...newIteration };
    if (!iterationToAdd.totalHours || iterationToAdd.totalHours <= 0) {
      iterationToAdd.totalHours = iterationToAdd.iterationDays * iterationToAdd.teamSize * 8;
    }

    setIterations(prev => [...prev, iterationToAdd]);
    
    // Set next iteration number and recalculate total hours for the new iteration
    setNewIteration(prev => {
      const nextIteration = {
        ...prev,
        iterationNumber: prev.iterationNumber + 1
      };
      
      // Recalculate total hours for the new iteration
      nextIteration.totalHours = nextIteration.iterationDays * nextIteration.teamSize * 8;
      
      return nextIteration;
    });
  };

  // Handle CSV file import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedData = results.data;
          
          // Check if this is a parameters file or iterations file
          if (parsedData.length > 0 && typeof parsedData[0] === 'object' && parsedData[0] !== null && 'costPerHour' in parsedData[0]) {
            // Parameters file
            const params = parsedData[0] as any;
            setBudgetParams({
              costPerHour: parseFloat(params.costPerHour) || 50,
              budgetSize: parseFloat(params.budgetSize) || 100000,
              teamSize: parseFloat(params.teamSize) || 5,
              workingDaysPerIteration: parseFloat(params.workingDaysPerIteration) || 10,
              currency: params.currency || "$"
            });
            // Reset pre-filled flag to allow regeneration of iterations with new parameters
            setIterationsPreFilled(false);
            toast.success("Budget parameters imported successfully");
          } else if (parsedData.length > 0 && typeof parsedData[0] === 'object' && parsedData[0] !== null && 'iterationNumber' in parsedData[0]) {
            // Iterations file
            if (parsedData.length > 100) {
              toast.error("CSV contains more than 100 iterations. Only the first 100 will be imported.");
            }
            
            const newIterations = parsedData.slice(0, 100).map((item: any) => {
              const iteration = {
                iterationNumber: parseFloat(item.iterationNumber) || 0,
                iterationDays: parseFloat(item.iterationDays) || 0,
                teamSize: parseFloat(item.teamSize) || 0,
                totalHours: parseFloat(item.totalHours) || 0,
                isCurrent: item.isCurrent === "true"
              };
              
              // If totalHours is not provided or is zero, calculate it
              if (!iteration.totalHours) {
                iteration.totalHours = iteration.iterationDays * iteration.teamSize * 8;
              }
              
              return iteration;
            });
            
            // Validate data
            const validIterations = newIterations.filter(it => 
              it.iterationNumber > 0 && it.iterationDays > 0 && it.teamSize > 0
            );
            
            if (validIterations.length !== newIterations.length) {
              toast.warning("Some iterations had invalid data and were skipped");
            }
            
            setIterations(validIterations);
            setIterationsPreFilled(true); // Mark as pre-filled since we've imported data
            toast.success(`${validIterations.length} iterations imported successfully`);
          } else {
            toast.error("Invalid CSV format. Please check the template.");
          }
        } catch (error) {
          toast.error("Error parsing CSV file");
          console.error(error);
        }
      },
      error: (error) => {
        toast.error("Error parsing CSV file");
        console.error(error);
      }
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Calculate chart data whenever parameters or iterations change
  useEffect(() => {
    const { costPerHour, teamSize, workingDaysPerIteration } = budgetParams;
    const standardHoursPerIteration = 8 * teamSize * workingDaysPerIteration;
    const standardIterationCost = costPerHour * standardHoursPerIteration;
    
    // Sort iterations by iteration number
    const sortedIterations = [...iterations].sort((a, b) => a.iterationNumber - b.iterationNumber);
    
    // Find the current iteration (if any)
    const currentIteration = sortedIterations.find(it => it.isCurrent);
    const currentIterationIndex = currentIteration 
      ? sortedIterations.findIndex(it => it.iterationNumber === currentIteration.iterationNumber)
      : sortedIterations.length - 1; // If no current iteration, use the last one
    
    let cumulativeStandard = 0;
    let cumulativeActual = 0;
    
    // Start with an initial data point at 0
    const data: ChartData[] = [
      {
        name: "Start",
        iterationCost: 0,
        cumulativeStandard: 0,
        cumulativeActual: 0
      }
    ];
    
    // Add data points for each iteration
    sortedIterations.forEach((iteration, index) => {
      // Get total hours (use calculated value if not set)
      const totalHours = iteration.totalHours || (iteration.iterationDays * iteration.teamSize * 8);
      
      // Calculate the cost for this iteration using total hours
      const iterationCost = costPerHour * totalHours;
      
      // Always calculate standard cumulative
      cumulativeStandard += standardIterationCost;
      
      // For actual cumulative, use actual data up to current iteration
      // After current iteration, follow standard data pattern
      if (index <= currentIterationIndex) {
        // Up to current iteration, use actual data
        cumulativeActual += iterationCost;
      } else {
        // After current iteration, follow standard data pattern
        cumulativeActual += standardIterationCost;
      }
      
      data.push({
        name: `Iteration ${iteration.iterationNumber}`,
        // Only show iteration cost up to current iteration
        iterationCost: index <= currentIterationIndex ? iterationCost : 0,
        cumulativeStandard,
        cumulativeActual
      });
    });
    
    setChartData(data);
  }, [budgetParams, iterations]);

  // Generate CSV template for download
  const generateParametersTemplate = () => {
    const headers = "costPerHour,budgetSize,teamSize,workingDaysPerIteration,currency\n";
    const values = `${budgetParams.costPerHour},${budgetParams.budgetSize},${budgetParams.teamSize},${budgetParams.workingDaysPerIteration},${budgetParams.currency}`;
    return headers + values;
  };

  const generateIterationsTemplate = () => {
    const headers = "iterationNumber,iterationDays,teamSize,totalHours,isCurrent\n";
    const values = iterations.map(it => 
      `${it.iterationNumber},${it.iterationDays},${it.teamSize},${it.totalHours || it.iterationDays * it.teamSize * 8},${it.isCurrent ? "true" : "false"}`
    ).join("\n");
    return headers + (values || "1,10,5,400,false");
  };

  const downloadTemplate = (type: "parameters" | "iterations") => {
    const content = type === "parameters" ? generateParametersTemplate() : generateIterationsTemplate();
    const filename = type === "parameters" ? "budget_parameters.csv" : "iterations.csv";
    
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate iterations up to 100% budget consumption
  const generateIterationsToFullBudget = () => {
    const { costPerHour, budgetSize, teamSize, workingDaysPerIteration } = budgetParams;
    
    // Calculate hours per iteration
    const hoursPerIteration = 8 * teamSize * workingDaysPerIteration;
    
    // Calculate cost per iteration with default parameters
    const costPerIteration = costPerHour * hoursPerIteration;
    
    // Skip if cost per iteration is zero (invalid parameters)
    if (costPerIteration <= 0 || budgetSize <= 0) return [];
    
    // Calculate how many iterations needed to consume the budget
    const iterationsNeeded = Math.ceil(budgetSize / costPerIteration);
    
    // Limit to 100 iterations maximum
    const iterationCount = Math.min(iterationsNeeded, 100);
    
    // Generate iterations
    const generatedIterations: IterationData[] = [];
    for (let i = 1; i <= iterationCount; i++) {
      generatedIterations.push({
        iterationNumber: i,
        iterationDays: workingDaysPerIteration,
        teamSize: teamSize,
        totalHours: hoursPerIteration,
        isCurrent: i === iterationCount // Mark the last iteration as current by default
      });
    }
    
    return generatedIterations;
  };
  
  // Check if actual cumulative crosses total budget and adjust iterations as needed
  const ensureActualCumulativeCrossesTotalBudget = () => {
    if (iterations.length === 0) return iterations;
    
    const { costPerHour, budgetSize, teamSize, workingDaysPerIteration } = budgetParams;
    const hoursPerIteration = 8 * teamSize * workingDaysPerIteration;
    const costPerIteration = costPerHour * hoursPerIteration;
    
    // Skip if cost per iteration is zero (invalid parameters)
    if (costPerIteration <= 0 || budgetSize <= 0) return iterations;
    
    // Sort iterations by iteration number
    const sortedIterations = [...iterations].sort((a, b) => a.iterationNumber - b.iterationNumber);
    
    // Find the current iteration (if any)
    const currentIteration = sortedIterations.find(it => it.isCurrent);
    const currentIterationIndex = currentIteration 
      ? sortedIterations.findIndex(it => it.iterationNumber === currentIteration.iterationNumber)
      : sortedIterations.length - 1; // If no current iteration, use the last one
    
    // Calculate cumulative actual cost up to current iteration
    let cumulativeActual = 0;
    for (let i = 0; i <= currentIterationIndex; i++) {
      const iteration = sortedIterations[i];
      const totalHours = iteration.totalHours || (iteration.iterationDays * iteration.teamSize * 8);
      cumulativeActual += costPerHour * totalHours;
    }
    
    // Calculate standard cost per iteration for projections
    const standardIterationCost = costPerHour * hoursPerIteration;
    
    // Calculate how many iterations are needed to reach the budget
    const iterationsNeededFromStart = Math.ceil(budgetSize / standardIterationCost);
    
    // If we already have more iterations than needed, we need to regenerate
    // This happens when budget parameters change significantly
    if (budgetSize < cumulativeActual || Math.abs(iterationsNeededFromStart - sortedIterations.length) > 3) {
      // Generate completely new iterations based on current parameters
      const generatedIterations = generateIterationsToFullBudget();
      return generatedIterations;
    }
    
    // Calculate projected cumulative cost with existing iterations
    let projectedCumulative = cumulativeActual;
    for (let i = currentIterationIndex + 1; i < sortedIterations.length; i++) {
      projectedCumulative += standardIterationCost;
    }
    
    // If projected cumulative already exceeds or equals budget, no need to add more iterations
    if (projectedCumulative >= budgetSize) {
      return sortedIterations;
    }
    
    // Calculate exactly how many iterations are needed to just exceed the budget
    const remainingBudget = budgetSize - projectedCumulative;
    const additionalIterationsNeeded = Math.ceil(remainingBudget / standardIterationCost);
    
    const maxIterationNumber = sortedIterations.length > 0 
      ? Math.max(...sortedIterations.map(it => it.iterationNumber))
      : 0;
    
    // Limit total iterations to 100
    const iterationsToAdd = Math.min(additionalIterationsNeeded, 100 - sortedIterations.length);
    
    if (iterationsToAdd <= 0) return sortedIterations; // No more iterations can be added
    
    // Add new iterations
    const newIterations = [...sortedIterations];
    
    // Add additional iterations while preserving current iteration state
    for (let i = 1; i <= iterationsToAdd; i++) {
      const newIterationNumber = maxIterationNumber + i;
      newIterations.push({
        iterationNumber: newIterationNumber,
        iterationDays: workingDaysPerIteration,
        teamSize: teamSize,
        totalHours: hoursPerIteration,
        isCurrent: false // Don't mark new iterations as current
      });
    }
    
    return newIterations;
  };
  
  // Pre-fill iterations when budget parameters change
  useEffect(() => {
    // Only pre-fill if no iterations exist yet and we haven't pre-filled before
    if (iterations.length === 0 && !iterationsPreFilled) {
      const generatedIterations = generateIterationsToFullBudget();
      if (generatedIterations.length > 0) {
        setIterations(generatedIterations);
        setIterationsPreFilled(true);
        
        // Update the next iteration number for manual additions
        setNewIteration(prev => ({
          ...prev,
          iterationNumber: generatedIterations.length + 1
        }));
      }
    }
  }, [budgetParams, iterations.length, iterationsPreFilled]);
  
  // Automatically adjust iterations when budget parameters change
  useEffect(() => {
    // Only adjust if we already have iterations
    if (iterations.length > 0) {
      // Use a timeout to ensure this runs after the state has been updated
      const timeoutId = setTimeout(() => {
        const updatedIterations = ensureActualCumulativeCrossesTotalBudget();
        
        // Check if we need to add or regenerate iterations
        if (updatedIterations.length !== iterations.length) {
          // Preserve the current iteration state
          const currentIteration = iterations.find(it => it.isCurrent);
          
          if (currentIteration) {
            // Find and mark the same iteration as current in the updated list
            const updatedWithCurrentPreserved = updatedIterations.map(it => ({
              ...it,
              isCurrent: it.iterationNumber === currentIteration.iterationNumber
            }));
            setIterations(updatedWithCurrentPreserved);
          } else {
            setIterations(updatedIterations);
          }
          
          // Update the next iteration number for manual additions
          const maxIterationNumber = Math.max(...updatedIterations.map(it => it.iterationNumber));
          setNewIteration(prev => ({
            ...prev,
            iterationNumber: maxIterationNumber + 1
          }));
          
          if (updatedIterations.length > iterations.length) {
            toast.success(`Added ${updatedIterations.length - iterations.length} iterations to reach total budget`);
          } else if (updatedIterations.length < iterations.length) {
            toast.info(`Adjusted iterations to match new budget parameters`);
          }
        }
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [budgetParams]);

  // Calculate budget consumption percentage and consumed budget based on current iteration
  const calculateBudgetMetrics = () => {
    if (chartData.length === 0 || budgetParams.budgetSize === 0) return { percentage: 0, consumed: 0 };
    
    // Find the current iteration in chart data
    const sortedIterations = [...iterations].sort((a, b) => a.iterationNumber - b.iterationNumber);
    const currentIteration = sortedIterations.find(it => it.isCurrent);
    
    if (!currentIteration) {
      // If no current iteration, use the last data point
      const latestData = chartData[chartData.length - 1];
      return {
        percentage: (latestData.cumulativeActual / budgetParams.budgetSize) * 100,
        consumed: latestData.cumulativeActual
      };
    }
    
    // Find the chart data point corresponding to the current iteration
    const currentDataPoint = chartData.find(data => data.name === `Iteration ${currentIteration.iterationNumber}`);
    
    if (!currentDataPoint) {
      // Fallback to last data point if current iteration not found in chart data
      const latestData = chartData[chartData.length - 1];
      return {
        percentage: (latestData.cumulativeActual / budgetParams.budgetSize) * 100,
        consumed: latestData.cumulativeActual
      };
    }
    
    return {
      percentage: (currentDataPoint.cumulativeActual / budgetParams.budgetSize) * 100,
      consumed: currentDataPoint.cumulativeActual
    };
  };

  const { percentage: budgetConsumptionPercentage, consumed: consumedBudget } = calculateBudgetMetrics();

  // Handle PDF report generation
  const handleGeneratePDF = async () => {
    if (chartData.length <= 1) {
      toast.error("No data to generate report. Please add iterations first.");
      return;
    }
    
    toast.info("Generating PDF report...");
    
    try {
      await generatePDFReport(budgetParams, iterations, chartData, chartRef);
      toast.success("PDF report generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    }
  };

  // Get current application state for saving/loading
  const getCurrentAppState = (): AppState => {
    return {
      budgetParams,
      iterations,
      chartData,
      visibleChartItems
    };
  };

  // Handle loading a saved state
  const handleLoadState = (state: AppState) => {
    // Ensure currency is set when loading older states that might not have it
    const updatedBudgetParams = {
      ...state.budgetParams,
      currency: state.budgetParams.currency || "$"
    };
    
    setBudgetParams(updatedBudgetParams);
    setIterations(state.iterations);
    setChartData(state.chartData);
    setIterationsPreFilled(true);
    
    // Load visible chart items if available
    if (state.visibleChartItems) {
      setVisibleChartItems(state.visibleChartItems);
    }
    
    // Update the next iteration number for manual additions
    if (state.iterations.length > 0) {
      const maxIterationNumber = Math.max(...state.iterations.map(it => it.iterationNumber));
      setNewIteration(prev => ({
        ...prev,
        iterationNumber: maxIterationNumber + 1
      }));
    }
  };

  return (
    <>
      <Head>
        <title>Budget Visualization</title>
        <meta name="description" content="Budget visualization tool" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="bg-background min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto py-6 px-4 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h1 className="text-3xl font-bold">Budget Visualization Tool</h1>
            <SaveStateManager 
              currentState={getCurrentAppState()} 
              onLoadState={handleLoadState}
              onGeneratePDF={handleGeneratePDF}
            />
          </div>
          
          <Tabs defaultValue="parameters" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="parameters">Budget Parameters</TabsTrigger>
              <TabsTrigger value="iterations">Iterations</TabsTrigger>
              <TabsTrigger value="visualization">Visualization</TabsTrigger>
            </TabsList>
            
            {/* Budget Parameters Tab */}
            <TabsContent value="parameters" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Budget Parameters</CardTitle>
                  <CardDescription>Set the initial parameters for your budget calculation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="costPerHour">Cost per Hour ({budgetParams.currency})</Label>
                      <Input
                        id="costPerHour"
                        name="costPerHour"
                        type="number"
                        value={budgetParams.costPerHour}
                        onChange={handleParamChange}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budgetSize">Total Budget Size ({budgetParams.currency})</Label>
                      <Input
                        id="budgetSize"
                        name="budgetSize"
                        type="number"
                        value={budgetParams.budgetSize}
                        onChange={handleParamChange}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teamSize">Default Team Size (people)</Label>
                      <Input
                        id="teamSize"
                        name="teamSize"
                        type="number"
                        value={budgetParams.teamSize}
                        onChange={handleParamChange}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workingDaysPerIteration">Working Days per Iteration</Label>
                      <Input
                        id="workingDaysPerIteration"
                        name="workingDaysPerIteration"
                        type="number"
                        value={budgetParams.workingDaysPerIteration}
                        onChange={handleParamChange}
                        min="1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency Symbol</Label>
                    <Input
                      id="currency"
                      name="currency"
                      type="text"
                      value={budgetParams.currency}
                      onChange={handleParamChange}
                      maxLength={3}
                      placeholder="$"
                    />
                    <p className="text-xs text-muted-foreground">Enter up to 3 letters for currency (e.g., USD, EUR, GBP)</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Iterations Tab */}
            <TabsContent value="iterations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Iteration Data</CardTitle>
                  <CardDescription>
                    Iterations are pre-filled based on initial parameters up to 100% budget consumption.
                    You can add, regenerate, or import custom iterations. The table below is editable - click on any Days or Team Size value to modify it.
                    <p className="mt-2 font-medium">
                      <span className="text-primary">Total Hours</span> can be calculated automatically from Days and Team Size (8 hours per day), 
                      but can also be manually overridden for more precise control.
                    </p>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="iterationNumber">Iteration Number</Label>
                      <Input
                        id="iterationNumber"
                        name="iterationNumber"
                        type="number"
                        value={newIteration.iterationNumber}
                        onChange={handleIterationChange}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iterationDays">Iteration Days</Label>
                      <Input
                        id="iterationDays"
                        name="iterationDays"
                        type="number"
                        value={newIteration.iterationDays}
                        onChange={handleIterationChange}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teamSize">Team Size</Label>
                      <Input
                        id="teamSize"
                        name="teamSize"
                        type="number"
                        value={newIteration.teamSize}
                        onChange={handleIterationChange}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalHours" className="text-primary font-bold">Total Hours</Label>
                      <Input
                        id="totalHours"
                        name="totalHours"
                        type="number"
                        value={newIteration.totalHours}
                        onChange={handleIterationChange}
                        min="1"
                        placeholder={`Default: ${newIteration.iterationDays * newIteration.teamSize * 8}`}
                        className="border-primary focus:ring-primary"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-between">
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIterations(generateIterationsToFullBudget());
                          setIterationsPreFilled(true);
                          
                          // Update the next iteration number for manual additions
                          const generatedIterations = generateIterationsToFullBudget();
                          setNewIteration(prev => ({
                            ...prev,
                            iterationNumber: generatedIterations.length + 1
                          }));
                          
                          toast.success("Iterations regenerated based on current parameters");
                        }}
                      >
                        Regenerate Iterations
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          const updatedIterations = ensureActualCumulativeCrossesTotalBudget();
                          if (updatedIterations.length > iterations.length) {
                            // Preserve the current iteration state
                            const currentIteration = iterations.find(it => it.isCurrent);
                            
                            if (currentIteration) {
                              // Find and mark the same iteration as current in the updated list
                              const updatedWithCurrentPreserved = updatedIterations.map(it => ({
                                ...it,
                                isCurrent: it.iterationNumber === currentIteration.iterationNumber
                              }));
                              setIterations(updatedWithCurrentPreserved);
                            } else {
                              setIterations(updatedIterations);
                            }
                            
                            // Update the next iteration number for manual additions
                            const maxIterationNumber = Math.max(...updatedIterations.map(it => it.iterationNumber));
                            setNewIteration(prev => ({
                              ...prev,
                              iterationNumber: maxIterationNumber + 1
                            }));
                            
                            toast.success(`Added ${updatedIterations.length - iterations.length} iterations to reach total budget`);
                          } else {
                            toast.info("No additional iterations needed - budget will be reached with current iterations");
                          }
                        }}
                      >
                        Add Iterations to Reach Budget
                      </Button>
                    </div>
                    <Button onClick={addIteration}>
                      Add Iteration
                    </Button>
                  </div>
                  
                  {iterations.length > 0 ? (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Iteration #</TableHead>
                            <TableHead>Days</TableHead>
                            <TableHead>Team Size</TableHead>
                            <TableHead className="text-primary font-bold">Total Hours</TableHead>
                            <TableHead className="text-right">Est. Cost ({budgetParams.currency})</TableHead>
                            <TableHead className="text-center">Current</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...iterations]
                            .sort((a, b) => a.iterationNumber - b.iterationNumber)
                            .map((iteration, index) => {
                              // Calculate total hours if not set
                              const totalHours = iteration.totalHours || iteration.iterationDays * iteration.teamSize * 8;
                              // Use total hours for cost calculation
                              const cost = budgetParams.costPerHour * totalHours;
                              return (
                                <TableRow key={iteration.iterationNumber}>
                                  <TableCell>{iteration.iterationNumber}</TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={iteration.iterationDays}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        if (value <= 0) {
                                          toast.error("Days must be greater than zero");
                                          return;
                                        }
                                        const updatedIterations = [...iterations];
                                        const sortedIndex = updatedIterations
                                          .sort((a, b) => a.iterationNumber - b.iterationNumber)
                                          .findIndex(it => it.iterationNumber === iteration.iterationNumber);
                                        if (sortedIndex !== -1) {
                                          // Update days and recalculate total hours if it wasn't manually set
                                          const currentIteration = updatedIterations[sortedIndex];
                                          const wasManuallySet = currentIteration.totalHours !== currentIteration.iterationDays * currentIteration.teamSize * 8;
                                          
                                          updatedIterations[sortedIndex] = {
                                            ...currentIteration,
                                            iterationDays: value,
                                            // Only auto-update total hours if it wasn't manually set
                                            ...(!wasManuallySet && {
                                              totalHours: value * currentIteration.teamSize * 8
                                            })
                                          };
                                          setIterations(updatedIterations);
                                          toast.success(`Updated days for iteration ${iteration.iterationNumber}`);
                                        }
                                      }}
                                      className="h-8 w-20 transition-colors hover:border-primary focus:border-primary"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={iteration.teamSize}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        if (value <= 0) {
                                          toast.error("Team size must be greater than zero");
                                          return;
                                        }
                                        const updatedIterations = [...iterations];
                                        const sortedIndex = updatedIterations
                                          .sort((a, b) => a.iterationNumber - b.iterationNumber)
                                          .findIndex(it => it.iterationNumber === iteration.iterationNumber);
                                        if (sortedIndex !== -1) {
                                          // Update team size and recalculate total hours if it wasn't manually set
                                          const currentIteration = updatedIterations[sortedIndex];
                                          const wasManuallySet = currentIteration.totalHours !== currentIteration.iterationDays * currentIteration.teamSize * 8;
                                          
                                          updatedIterations[sortedIndex] = {
                                            ...currentIteration,
                                            teamSize: value,
                                            // Only auto-update total hours if it wasn't manually set
                                            ...(!wasManuallySet && {
                                              totalHours: currentIteration.iterationDays * value * 8
                                            })
                                          };
                                          setIterations(updatedIterations);
                                          toast.success(`Updated team size for iteration ${iteration.iterationNumber}`);
                                        }
                                      }}
                                      className="h-8 w-20 transition-colors hover:border-primary focus:border-primary"
                                    />
                                  </TableCell>
                                  <TableCell className="text-primary">
                                    <Input
                                      type="number"
                                      min="1"
                                      value={totalHours}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        if (value <= 0) {
                                          toast.error("Total hours must be greater than zero");
                                          return;
                                        }
                                        const updatedIterations = [...iterations];
                                        const sortedIndex = updatedIterations
                                          .sort((a, b) => a.iterationNumber - b.iterationNumber)
                                          .findIndex(it => it.iterationNumber === iteration.iterationNumber);
                                        if (sortedIndex !== -1) {
                                          updatedIterations[sortedIndex] = {
                                            ...updatedIterations[sortedIndex],
                                            totalHours: value
                                          };
                                          setIterations(updatedIterations);
                                          toast.success(`Updated total hours for iteration ${iteration.iterationNumber}`);
                                        }
                                      }}
                                      className="h-8 w-20 transition-colors border-primary hover:border-primary focus:border-primary"
                                    />
                                  </TableCell>
                                  <TableCell className="text-right">{cost.toLocaleString()}</TableCell>
                                  <TableCell className="text-center">
                                    <input
                                      type="checkbox"
                                      checked={iteration.isCurrent || false}
                                      onChange={() => {
                                        const updatedIterations = [...iterations].map(it => ({
                                          ...it,
                                          isCurrent: it.iterationNumber === iteration.iterationNumber
                                        }));
                                        setIterations(updatedIterations);
                                        toast.success(`Iteration ${iteration.iterationNumber} marked as current`);
                                      }}
                                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        No iterations added yet. Add iterations manually or import from CSV.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-lg font-medium mb-2">Import/Export Iterations</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" onClick={() => downloadTemplate("iterations")}>
                        Download Template
                      </Button>
                      <div className="relative">
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="iterations-csv-upload"
                        />
                        <Button onClick={() => document.getElementById("iterations-csv-upload")?.click()}>
                          Import CSV
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-muted-foreground">
                    {iterations.length}/100 iterations added
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Visualization Tab */}
            <TabsContent value="visualization" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Budget Visualization</CardTitle>
                  <CardDescription>
                    Visualize your budget consumption across iterations. The chart shows cumulative costs on the right Y-axis and individual iteration costs (as bars) on the left Y-axis.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {chartData.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                              <h3 className="text-2xl font-bold">{budgetParams.currency}{budgetParams.budgetSize.toLocaleString()}</h3>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <p className="text-sm font-medium text-muted-foreground">Consumed Budget</p>
                              <h3 className="text-2xl font-bold">
                                {budgetParams.currency}{consumedBudget.toLocaleString()}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                (up to current iteration)
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <p className="text-sm font-medium text-muted-foreground">Consumption Rate</p>
                              <h3 className="text-2xl font-bold">
                                {budgetConsumptionPercentage.toFixed(1)}%
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                (at current iteration)
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <ToggleGroup 
                            type="multiple" 
                            value={visibleChartItems}
                            onValueChange={(value) => {
                              // Ensure at least one item is always visible
                              if (value.length > 0) {
                                setVisibleChartItems(value);
                              }
                            }}
                          >
                            <ToggleGroupItem value="standardCumulative" aria-label="Toggle Standard Cumulative">
                              <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#10b981]"></span>
                                Standard Cumulative
                              </span>
                            </ToggleGroupItem>
                            <ToggleGroupItem value="actualCumulative" aria-label="Toggle Actual Cumulative">
                              <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span>
                                Actual Cumulative
                              </span>
                            </ToggleGroupItem>
                            <ToggleGroupItem value="individualCost" aria-label="Toggle Individual Cost">
                              <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#4f46e5]"></span>
                                Individual Cost
                              </span>
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </div>
                        
                        <div className="h-[500px] w-full" ref={chartRef}>
                          <ChartContainer
                            config={{
                              individualCost: { label: "Individual Cost", color: "#4f46e5" },
                              cumulativeStandard: { label: "Standard Cumulative", color: "#10b981" },
                              cumulativeActual: { label: "Actual Cumulative", color: "#f59e0b" },
                            }}
                          >
                            <ComposedChart
                              data={chartData}
                              margin={{ top: 10, right: 30, left: 0, bottom: 70 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="name" 
                                allowDataOverflow={false}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                                interval={0}
                              />
                              {/* Primary Y-axis for cumulative costs */}
                              <YAxis 
                                yAxisId="right"
                                orientation="right"
                                domain={[0, 'auto']}
                                label={{ value: `Cumulative Cost (${budgetParams.currency})`, angle: -90, position: 'insideRight' }}
                                tickFormatter={(value) => {
                                  if (value >= 1000000) {
                                    return `${(value / 1000000).toFixed(1)}M`;
                                  } else if (value >= 1000) {
                                    return `${(value / 1000).toFixed(1)}K`;
                                  }
                                  return value;
                                }}
                              />
                              {/* Secondary Y-axis for individual iteration costs */}
                              <YAxis 
                                yAxisId="left"
                                orientation="left"
                                domain={[0, 250000]}
                                label={{ value: `Iteration Cost (${budgetParams.currency})`, angle: -90, position: 'insideLeft' }}
                                tickFormatter={(value) => {
                                  if (value >= 1000000) {
                                    return `${(value / 1000000).toFixed(1)}M`;
                                  } else if (value >= 1000) {
                                    return `${(value / 1000).toFixed(1)}K`;
                                  }
                                  return value;
                                }}
                              />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              {/* Red dotted horizontal line at total budget level */}
                              <RechartsPrimitive.ReferenceLine 
                                y={budgetParams.budgetSize} 
                                yAxisId="right" 
                                stroke="red" 
                                strokeDasharray="5 5" 
                                label={{ 
                                  value: "Total Budget", 
                                  position: "insideTopRight",
                                  fill: "red",
                                  fontSize: 12
                                }} 
                              />
                              {visibleChartItems.includes("standardCumulative") && (
                                <Area
                                  yAxisId="right"
                                  type="monotone"
                                  dataKey="cumulativeStandard"
                                  stroke="#10b981"
                                  fill="#10b981"
                                  fillOpacity={0.1}
                                  strokeWidth={2}
                                  name="Standard Cumulative"
                                />
                              )}
                              {visibleChartItems.includes("actualCumulative") && (
                                <Area
                                  yAxisId="right"
                                  type="monotone"
                                  dataKey="cumulativeActual"
                                  stroke="#f59e0b"
                                  fill="#f59e0b"
                                  fillOpacity={0.1}
                                  strokeWidth={2}
                                  name="Actual Cumulative"
                                />
                              )}
                              {/* Blue bars for individual iteration costs */}
                              {visibleChartItems.includes("individualCost") && (
                                <Bar
                                  yAxisId="left"
                                  dataKey="iterationCost"
                                  fill="#4f46e5"
                                  fillOpacity={0.6}
                                  name="Individual Cost"
                                  barSize={20}
                                />
                              )}
                              <Legend />
                            </ComposedChart>
                          </ChartContainer>
                        </div>
                      </div>
                      

                    </>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        No data to visualize. Please add iterations in the Iterations tab.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
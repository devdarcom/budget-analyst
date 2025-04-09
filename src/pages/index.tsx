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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, BarChart, ResponsiveContainer } from "recharts";
import Papa from "papaparse";
import { toast } from "sonner";

// Types
interface BudgetParams {
  costPerHour: number;
  budgetSize: number;
  teamSize: number;
  workingDaysPerIteration: number;
}

interface IterationData {
  iterationNumber: number;
  iterationDays: number;
  teamSize: number;
}

interface ChartData {
  name: string;
  iterationCost: number;
  cumulativeStandard: number;
  cumulativeActual: number;
}

export default function Home() {
  // State for budget parameters
  const [budgetParams, setBudgetParams] = useState<BudgetParams>({
    costPerHour: 50,
    budgetSize: 100000,
    teamSize: 5,
    workingDaysPerIteration: 10
  });

  // State for iteration data
  const [iterations, setIterations] = useState<IterationData[]>([]);
  const [newIteration, setNewIteration] = useState<IterationData>({
    iterationNumber: 1,
    iterationDays: 10,
    teamSize: 5
  });

  // State for chart data
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle budget parameter changes
  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBudgetParams(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  // Handle new iteration input changes
  const handleIterationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewIteration(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
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

    setIterations(prev => [...prev, { ...newIteration }]);
    
    // Set next iteration number
    setNewIteration(prev => ({
      ...prev,
      iterationNumber: prev.iterationNumber + 1
    }));
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
              workingDaysPerIteration: parseFloat(params.workingDaysPerIteration) || 10
            });
            toast.success("Budget parameters imported successfully");
          } else if (parsedData.length > 0 && typeof parsedData[0] === 'object' && parsedData[0] !== null && 'iterationNumber' in parsedData[0]) {
            // Iterations file
            if (parsedData.length > 100) {
              toast.error("CSV contains more than 100 iterations. Only the first 100 will be imported.");
            }
            
            const newIterations = parsedData.slice(0, 100).map((item: any) => ({
              iterationNumber: parseFloat(item.iterationNumber) || 0,
              iterationDays: parseFloat(item.iterationDays) || 0,
              teamSize: parseFloat(item.teamSize) || 0
            }));
            
            // Validate data
            const validIterations = newIterations.filter(it => 
              it.iterationNumber > 0 && it.iterationDays > 0 && it.teamSize > 0
            );
            
            if (validIterations.length !== newIterations.length) {
              toast.warning("Some iterations had invalid data and were skipped");
            }
            
            setIterations(validIterations);
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
    const standardIterationCost = costPerHour * 8 * teamSize * workingDaysPerIteration;
    
    // Sort iterations by iteration number
    const sortedIterations = [...iterations].sort((a, b) => a.iterationNumber - b.iterationNumber);
    
    let cumulativeStandard = 0;
    let cumulativeActual = 0;
    
    const data: ChartData[] = sortedIterations.map(iteration => {
      const iterationCost = costPerHour * 8 * iteration.teamSize * iteration.iterationDays;
      cumulativeStandard += standardIterationCost;
      cumulativeActual += iterationCost;
      
      return {
        name: `Iteration ${iteration.iterationNumber}`,
        iterationCost,
        cumulativeStandard,
        cumulativeActual
      };
    });
    
    setChartData(data);
  }, [budgetParams, iterations]);

  // Generate CSV template for download
  const generateParametersTemplate = () => {
    const headers = "costPerHour,budgetSize,teamSize,workingDaysPerIteration\n";
    const values = `${budgetParams.costPerHour},${budgetParams.budgetSize},${budgetParams.teamSize},${budgetParams.workingDaysPerIteration}`;
    return headers + values;
  };

  const generateIterationsTemplate = () => {
    const headers = "iterationNumber,iterationDays,teamSize\n";
    const values = iterations.map(it => `${it.iterationNumber},${it.iterationDays},${it.teamSize}`).join("\n");
    return headers + (values || "1,10,5");
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

  // Calculate budget consumption percentage
  const calculateBudgetConsumption = () => {
    if (chartData.length === 0 || budgetParams.budgetSize === 0) return 0;
    const latestData = chartData[chartData.length - 1];
    return (latestData.cumulativeActual / budgetParams.budgetSize) * 100;
  };

  const budgetConsumptionPercentage = calculateBudgetConsumption();

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
          <h1 className="text-3xl font-bold">Budget Visualization Tool</h1>
          
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
                      <Label htmlFor="costPerHour">Cost per Hour ($)</Label>
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
                      <Label htmlFor="budgetSize">Total Budget Size ($)</Label>
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
                  
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-lg font-medium mb-2">Import/Export Parameters</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" onClick={() => downloadTemplate("parameters")}>
                        Download Template
                      </Button>
                      <div className="relative">
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="csv-upload"
                        />
                        <Button onClick={() => fileInputRef.current?.click()}>
                          Import CSV
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Iterations Tab */}
            <TabsContent value="iterations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Iteration Data</CardTitle>
                  <CardDescription>Add or import iteration-specific data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  </div>
                  
                  <div className="flex justify-end">
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
                            <TableHead className="text-right">Est. Cost ($)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...iterations]
                            .sort((a, b) => a.iterationNumber - b.iterationNumber)
                            .map((iteration) => {
                              const cost = budgetParams.costPerHour * 8 * iteration.teamSize * iteration.iterationDays;
                              return (
                                <TableRow key={iteration.iterationNumber}>
                                  <TableCell>{iteration.iterationNumber}</TableCell>
                                  <TableCell>{iteration.iterationDays}</TableCell>
                                  <TableCell>{iteration.teamSize}</TableCell>
                                  <TableCell className="text-right">{cost.toLocaleString()}</TableCell>
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
                    Visualize your budget consumption across iterations
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
                              <h3 className="text-2xl font-bold">${budgetParams.budgetSize.toLocaleString()}</h3>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <p className="text-sm font-medium text-muted-foreground">Consumed Budget</p>
                              <h3 className="text-2xl font-bold">
                                ${chartData[chartData.length - 1].cumulativeActual.toLocaleString()}
                              </h3>
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
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="h-[400px] w-full">
                        <ChartContainer
                          config={{
                            iterationCost: { label: "Iteration Cost", color: "#4f46e5" },
                            cumulativeStandard: { label: "Standard Cumulative", color: "#10b981" },
                            cumulativeActual: { label: "Actual Cumulative", color: "#f59e0b" },
                          }}
                        >
                          <AreaChart
                            data={chartData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Area
                              type="monotone"
                              dataKey="cumulativeStandard"
                              stroke="#10b981"
                              fill="#10b981"
                              fillOpacity={0.1}
                              strokeWidth={2}
                            />
                            <Area
                              type="monotone"
                              dataKey="cumulativeActual"
                              stroke="#f59e0b"
                              fill="#f59e0b"
                              fillOpacity={0.1}
                              strokeWidth={2}
                            />
                            <Legend />
                          </AreaChart>
                        </ChartContainer>
                      </div>
                      
                      <div className="h-[300px] w-full">
                        <ChartContainer
                          config={{
                            iterationCost: { label: "Iteration Cost", color: "#4f46e5" },
                          }}
                        >
                          <BarChart
                            data={chartData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="iterationCost" fill="#4f46e5" />
                            <Legend />
                          </BarChart>
                        </ChartContainer>
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
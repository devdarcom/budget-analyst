export interface BudgetParams {
  costPerHour: number;
  budgetSize: number;
  teamSize: number;
  workingDaysPerIteration: number;
}

export interface IterationData {
  iterationNumber: number;
  iterationDays: number;
  teamSize: number;
  totalHours?: number; // Optional to maintain backward compatibility
}

export interface ChartData {
  name: string;
  iterationCost: number;
  cumulativeStandard: number;
  cumulativeActual: number;
}
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BudgetParams, IterationData, ChartData } from '@/types/budget';

export async function generatePDFReport(
  budgetParams: BudgetParams,
  iterations: IterationData[],
  chartData: ChartData[],
  chartRef: React.RefObject<HTMLDivElement>
) {
  // Create a new PDF document
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  let yPosition = margin;
  
  // Add title
  pdf.setFontSize(20);
  pdf.text('Budget Visualization Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;
  
  // Add date
  pdf.setFontSize(10);
  pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  
  // Add budget parameters section
  pdf.setFontSize(16);
  pdf.text('Budget Parameters', margin, yPosition);
  yPosition += 8;
  
  pdf.setFontSize(12);
  pdf.text(`Cost per Hour: ${budgetParams.currency}${budgetParams.costPerHour}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Total Budget Size: ${budgetParams.currency}${budgetParams.budgetSize.toLocaleString()}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Default Team Size: ${budgetParams.teamSize} people`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Working Days per Iteration: ${budgetParams.workingDaysPerIteration} days`, margin, yPosition);
  yPosition += 15;
  
  // Add chart visualization
  if (chartRef.current) {
    // Check if we need a new page for the chart
    if (yPosition > pageHeight / 3) {
      pdf.addPage();
      yPosition = margin;
    }
    
    pdf.setFontSize(16);
    pdf.text('Budget Visualization Chart', margin, yPosition);
    yPosition += 10;
    
    try {
      // Capture the chart as an image
      const canvas = await html2canvas(chartRef.current, {
        scale: 2, // Higher scale for better quality
        logging: false,
        useCORS: true,
        height: chartRef.current.scrollHeight, // Ensure full height is captured
        width: chartRef.current.scrollWidth, // Ensure full width is captured
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - (margin * 2);
      
      // Calculate height while maintaining aspect ratio
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Check if the image will fit on the current page
      if (yPosition + imgHeight > pageHeight - margin) {
        // Add a new page if the chart is too large for remaining space
        pdf.addPage();
        yPosition = margin;
      }
      
      // Add the chart image to the PDF with proper scaling
      pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 15;
    } catch (error) {
      console.error('Error capturing chart:', error);
      pdf.text('Error capturing chart visualization', margin, yPosition);
      yPosition += 10;
    }
  }
  
  // Add iterations table
  if (iterations.length > 0) {
    // Check if we need a new page for the table
    if (yPosition > pageHeight - 100) {
      pdf.addPage();
      yPosition = margin;
    }
    
    pdf.setFontSize(16);
    pdf.text('Iterations and Budget Consumption', margin, yPosition);
    yPosition += 10;
    
    // Sort iterations by iteration number
    const sortedIterations = [...iterations].sort((a, b) => a.iterationNumber - b.iterationNumber);
    
    // Calculate the budget consumption for each iteration
    let cumulativeCost = 0;
    const iterationBudgetData = sortedIterations.map(iteration => {
      // Get total hours (use calculated value if not set)
      const totalHours = iteration.totalHours || (iteration.iterationDays * iteration.teamSize * 8);
      
      // Calculate cost using total hours
      const iterationCost = budgetParams.costPerHour * totalHours;
      
      cumulativeCost += iterationCost;
      const remainingBudget = budgetParams.budgetSize - cumulativeCost;
      const budgetConsumed = (cumulativeCost / budgetParams.budgetSize) * 100;
      
      return {
        ...iteration,
        totalHours,
        iterationCost,
        cumulativeCost,
        remainingBudget,
        budgetConsumed,
        budgetExceeded: remainingBudget < 0
      };
    });
    
    // Find the iteration where budget is fully consumed
    const budgetFullyConsumedIndex = iterationBudgetData.findIndex(data => data.remainingBudget < 0);
    
    // Table headers - removed 'Days' and 'Team Size' columns as requested
    const headers = ['Iteration #', 'Hours', `Cost (${budgetParams.currency})`, `Cumulative (${budgetParams.currency})`, `Remaining (${budgetParams.currency})`, 'Consumed (%)'];
    const colWidths = [18, 20, 25, 30, 30, 30];
    
    // Calculate total width
    const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
    const startX = (pageWidth - tableWidth) / 2;
    
    // Draw table headers
    pdf.setFillColor(240, 240, 240);
    pdf.rect(startX, yPosition, tableWidth, 8, 'F');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    
    let xOffset = startX;
    headers.forEach((header, i) => {
      pdf.text(header, xOffset + 2, yPosition + 5);
      xOffset += colWidths[i];
    });
    yPosition += 8;
    
    // Draw table rows
    iterationBudgetData.forEach((data, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 15) {
        pdf.addPage();
        yPosition = margin;
        
        // Redraw headers on new page
        pdf.setFillColor(240, 240, 240);
        pdf.rect(startX, yPosition, tableWidth, 8, 'F');
        
        xOffset = startX;
        headers.forEach((header, i) => {
          pdf.text(header, xOffset + 2, yPosition + 5);
          xOffset += colWidths[i];
        });
        yPosition += 8;
      }
      
      // Highlight row if budget is fully consumed at this iteration
      if (index === budgetFullyConsumedIndex || 
          (budgetFullyConsumedIndex === -1 && data.budgetConsumed >= 100)) {
        pdf.setFillColor(255, 240, 240);
        pdf.rect(startX, yPosition, tableWidth, 8, 'F');
      } else if (data.budgetExceeded) {
        pdf.setFillColor(255, 220, 220);
        pdf.rect(startX, yPosition, tableWidth, 8, 'F');
      }
      
      // Draw row data - removed 'Days' and 'Team Size' columns
      xOffset = startX;
      
      pdf.text(data.iterationNumber.toString(), xOffset + 2, yPosition + 5);
      xOffset += colWidths[0];
      
      pdf.text(data.totalHours.toString(), xOffset + 2, yPosition + 5);
      xOffset += colWidths[1];
      
      pdf.text(data.iterationCost.toLocaleString(), xOffset + 2, yPosition + 5);
      xOffset += colWidths[2];
      
      pdf.text(data.cumulativeCost.toLocaleString(), xOffset + 2, yPosition + 5);
      xOffset += colWidths[3];
      
      pdf.text(data.remainingBudget.toLocaleString(), xOffset + 2, yPosition + 5);
      xOffset += colWidths[4];
      
      pdf.text(`${data.budgetConsumed.toFixed(1)}%`, xOffset + 2, yPosition + 5);
      
      yPosition += 8;
    });
    
    // Add note about highlighted row
    yPosition += 5;
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Note: Highlighted row indicates the iteration where budget is fully consumed.', margin, yPosition);
  }
  
  // Save the PDF
  pdf.save('budget_report.pdf');
  
  return true;
}
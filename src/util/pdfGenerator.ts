import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BudgetParams, IterationData, ChartData } from '@/types/budget';

// Helper function to format numbers with K suffix
const formatNumberWithSuffix = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

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
  
  // Add logo
  // Using a PNG version of the logo for better compatibility with jsPDF
  // We're using the same URL but jsPDF will handle it better as a PNG
  const logoUrl = 'https://assets.co.dev/aff91ec6-0d31-4a32-ad90-44b87fbbf8dc/fully-transparent-logo-0e7b719.svg';
  
  // Function to load an image and convert to base64
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  };
  
  try {
    // Load the image
    const img = await loadImage(logoUrl);
    
    // Create a canvas to draw the image (this helps with SVG conversion)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    const logoWidth = 30; // in mm
    const logoWidthPx = logoWidth * 3.779528; // Convert mm to px (approximate)
    const logoHeightPx = (img.height / img.width) * logoWidthPx;
    
    canvas.width = logoWidthPx;
    canvas.height = logoHeightPx;
    
    // Draw image on canvas
    if (ctx) {
      ctx.drawImage(img, 0, 0, logoWidthPx, logoHeightPx);
      
      // Get data URL from canvas
      const imgData = canvas.toDataURL('image/png');
      
      // Center the logo horizontally
      const logoX = (pageWidth - logoWidth) / 2;
      
      // Add the logo to the PDF
      pdf.addImage(imgData, 'PNG', logoX, yPosition, logoWidth, logoWidth * (logoHeightPx / logoWidthPx));
      
      // Update yPosition to account for logo height plus some spacing
      yPosition += (logoWidth * (logoHeightPx / logoWidthPx)) + 10;
    }
  } catch (error) {
    console.error('Error loading logo:', error);
    // If logo fails to load, just continue without it
    // No need to adjust yPosition since no logo was added
  }
  
  // Add title
  pdf.setFontSize(20);
  pdf.text('Budget Visualization Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;
  
  // Add date
  pdf.setFontSize(10);
  pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  
  // Budget Parameters section removed as requested
  yPosition += 5;
  
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
    
    // Calculate budget metrics for badges
    const sortedIterations = [...iterations].sort((a, b) => a.iterationNumber - b.iterationNumber);
    const currentIteration = sortedIterations.find(it => it.isCurrent);
    
    // Calculate budget consumption metrics
    let cumulativeCost = 0;
    let currentIterationCost = 0;
    let currentIterationNumber = 0;
    
    sortedIterations.forEach((iteration, index) => {
      const totalHours = iteration.totalHours || (iteration.iterationDays * iteration.teamSize * 8);
      const iterationCost = budgetParams.costPerHour * totalHours;
      
      if (iteration.isCurrent) {
        currentIterationCost = iterationCost;
        currentIterationNumber = iteration.iterationNumber;
      }
      
      if (!currentIteration || index <= sortedIterations.indexOf(currentIteration)) {
        cumulativeCost += iterationCost;
      }
    });
    
    const budgetConsumptionPercentage = (cumulativeCost / budgetParams.budgetSize) * 100;
    const remainingBudget = budgetParams.budgetSize - cumulativeCost;
    
    // Add badges with stats above the chart
    const badgeWidth = (pageWidth - (margin * 2)) / 3;
    const badgeHeight = 15;
    
    // Badge 1: Total Budget - white filling with black border and black text
    pdf.setFillColor(255, 255, 255); // White fill
    pdf.roundedRect(margin, yPosition, badgeWidth - 2, badgeHeight, 2, 2, 'F');
    pdf.setDrawColor(0, 0, 0); // Black border
    pdf.roundedRect(margin, yPosition, badgeWidth - 2, badgeHeight, 2, 2, 'S');
    pdf.setTextColor(0, 0, 0); // Black text
    pdf.setFontSize(8);
    pdf.text('TOTAL BUDGET', margin + (badgeWidth - 2) / 2, yPosition + 4, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text(`${budgetParams.currency}${formatNumberWithSuffix(budgetParams.budgetSize)}`, margin + (badgeWidth - 2) / 2, yPosition + 11, { align: 'center' });
    
    // Badge 2: Consumed Budget - white filling with black border and black text
    pdf.setFillColor(255, 255, 255); // White fill
    pdf.roundedRect(margin + badgeWidth, yPosition, badgeWidth - 2, badgeHeight, 2, 2, 'F');
    pdf.setDrawColor(0, 0, 0); // Black border
    pdf.roundedRect(margin + badgeWidth, yPosition, badgeWidth - 2, badgeHeight, 2, 2, 'S');
    pdf.setTextColor(0, 0, 0); // Black text
    pdf.setFontSize(8);
    pdf.text('CONSUMED BUDGET', margin + badgeWidth + (badgeWidth - 2) / 2, yPosition + 4, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text(`${budgetParams.currency}${formatNumberWithSuffix(cumulativeCost)} (${budgetConsumptionPercentage.toFixed(1)}%)`, margin + badgeWidth + (badgeWidth - 2) / 2, yPosition + 11, { align: 'center' });
    
    // Badge 3: Remaining Budget - white filling with black border and black text
    pdf.setFillColor(255, 255, 255); // White fill
    pdf.roundedRect(margin + badgeWidth * 2, yPosition, badgeWidth - 2, badgeHeight, 2, 2, 'F');
    pdf.setDrawColor(0, 0, 0); // Black border
    pdf.roundedRect(margin + badgeWidth * 2, yPosition, badgeWidth - 2, badgeHeight, 2, 2, 'S');
    pdf.setTextColor(0, 0, 0); // Black text
    pdf.setFontSize(8);
    pdf.text('REMAINING BUDGET', margin + badgeWidth * 2 + (badgeWidth - 2) / 2, yPosition + 4, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text(`${budgetParams.currency}${formatNumberWithSuffix(remainingBudget)}`, margin + badgeWidth * 2 + (badgeWidth - 2) / 2, yPosition + 11, { align: 'center' });
    
    // Reset draw color
    pdf.setDrawColor(0, 0, 0);
    yPosition += badgeHeight + 5;
    
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
      
      // Highlight row if it's the current iteration
      if (data.isCurrent) {
        pdf.setFillColor(200, 220, 255); // Blue opacity color
        pdf.rect(startX, yPosition, tableWidth, 8, 'F');
      }
      // Highlight row if budget is fully consumed at this iteration
      else if (index === budgetFullyConsumedIndex || 
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
    
    // Add notes about highlighted rows
    yPosition += 5;
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Note: Highlighted rows indicate:', margin, yPosition);
    yPosition += 5;
    
    // Blue highlight note
    pdf.setFillColor(200, 220, 255);
    pdf.rect(margin, yPosition - 3, 5, 5, 'F');
    pdf.text('Current iteration', margin + 8, yPosition);
    yPosition += 5;
    
    // Red highlight note
    pdf.setFillColor(255, 240, 240);
    pdf.rect(margin, yPosition - 3, 5, 5, 'F');
    pdf.text('Iteration where budget is fully consumed', margin + 8, yPosition);
  }
  
  // Save the PDF
  pdf.save('budget_report.pdf');
  
  return true;
}
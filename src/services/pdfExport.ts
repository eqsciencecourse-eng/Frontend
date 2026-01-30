import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDF = async (elementId: string, fileName: string = 'report.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Element not found');
        return;
    }

    try {
        const canvas = await html2canvas(element, {
            scale: 2, // Higher scale for better quality
            useCORS: true, // For images
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm

        const canvasRatio = canvas.height / canvas.width;
        const pageRatio = pageHeight / imgWidth;

        let finalWidth = imgWidth;
        let finalHeight = imgWidth * canvasRatio;

        // If image is taller than page, scale it down to fit height
        if (finalHeight > pageHeight) {
            const scaleFactor = pageHeight / finalHeight;
            finalWidth = finalWidth * scaleFactor;
            finalHeight = pageHeight;
        }

        // Center horizontally if scaled down
        const xOffset = (imgWidth - finalWidth) / 2;

        pdf.addImage(imgData, 'PNG', xOffset, 0, finalWidth, finalHeight);

        pdf.save(fileName);
    } catch (error) {
        console.error('Error generating PDF:', error);
    }
};

import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';

/**
 * Reusable service for generating PDF tables with Thai font support.
 */
export const TablePdfService = {
    /**
     * Fetches and registers Sarabun (Thai) fonts into the jsPDF instance.
     */
    async loadThaiFonts(doc: jsPDF): Promise<void> {
        const fetchFont = async (url: string, filename: string, fontName: string, fontStyle: string) => {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to fetch font from ${url}`);
                const blob = await response.blob();

                return new Promise<void>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const fontBase64 = reader.result?.toString().split(',')[1];
                        if (fontBase64) {
                            doc.addFileToVFS(filename, fontBase64);
                            doc.addFont(filename, fontName, fontStyle);
                        }
                        resolve();
                    };
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.warn(`Font loading warning: ${error}`);
            }
        };

        await Promise.all([
            fetchFont(
                'https://raw.githubusercontent.com/cadsondemak/Sarabun/master/fonts/Sarabun-Regular.ttf',
                'Sarabun-Regular.ttf',
                'Sarabun',
                'normal'
            ),
            fetchFont(
                'https://raw.githubusercontent.com/cadsondemak/Sarabun/master/fonts/Sarabun-Bold.ttf',
                'Sarabun-Bold.ttf',
                'Sarabun',
                'bold'
            )
        ]);

        doc.setFont('Sarabun', 'normal');
    },

    /**
     * Generates a PDF with a table.
     * @param options Configuration for the PDF content and table
     */
    async generateTablePDF(options: {
        title: string;
        subtitle?: string;
        fileName: string;
        tableOptions: UserOptions;
        autoDownload?: boolean;
        onBeforeSave?: (doc: jsPDF) => void;
    }): Promise<jsPDF> {
        const doc = new jsPDF();

        // Load Thai fonts
        await this.loadThaiFonts(doc);

        // Initial positioning
        let currentY = 15;

        // Title
        doc.setFontSize(18);
        doc.text(options.title, 14, currentY);
        currentY += 7;

        // Subtitle
        if (options.subtitle) {
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(options.subtitle, 14, currentY);
            currentY += 10;
        }

        // Table
        autoTable(doc, {
            startY: currentY,
            styles: { font: 'Sarabun', fontSize: 10, cellPadding: 2 },
            headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold' }, // Indigo-700
            margin: { top: 20 },
            ...options.tableOptions
        });

        if (options.onBeforeSave) {
            options.onBeforeSave(doc);
        }

        if (options.autoDownload !== false) {
            doc.save(options.fileName);
        }

        return doc;
    }
};

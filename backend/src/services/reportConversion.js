const ejs = require('ejs');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'templates', 'report.ejs');
const CSS_PATH = path.join(__dirname, '..', '..', 'templates', 'report.css');

/**
 * Convert JSON report data to HTML
 * @param {Object} jsonData - Report data following the IRVM schema
 * @returns {Promise<string>} HTML content
 */
async function jsonToHtml(jsonData) {
  try {
    if (!fs.existsSync(TEMPLATE_PATH)) {
      throw new Error('Template file not found');
    }
    if (!fs.existsSync(CSS_PATH)) {
      throw new Error('CSS file not found');
    }

    const css = fs.readFileSync(CSS_PATH, 'utf-8');
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    const templateData = {
      css,
      cover: jsonData.cover,
      executive_summary: jsonData.executive_summary,
      methodology: jsonData.methodology,
      findings: jsonData.findings,
      version_comparison: jsonData.version_comparison || null,
      api_analysis: jsonData.api_analysis || null,
      compliance: jsonData.compliance || null,
      conclusion: jsonData.conclusion,
      appendix: jsonData.appendix,
      footer: jsonData.footer || {}
    };

    const html = ejs.render(template, templateData);
    return html;
  } catch (error) {
    console.error('Error converting JSON to HTML:', error);
    throw new Error('Failed to convert JSON to HTML: ' + error.message);
  }
}

/**
 * Convert HTML to PDF using Puppeteer
 * @param {string} html - HTML content
 * @returns {Promise<Buffer>} PDF buffer
 */
async function htmlToPdf(html) {
  try {
    console.log('Starting Puppeteer PDF generation...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    console.log('Browser launched');
    const page = await browser.newPage();
    
    // Set content with a simpler wait condition
    await page.setContent(html, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    console.log('HTML content set');
    
    // Wait a bit for styles to apply
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-size:8px;text-align:center;width:100%;color:#999;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
      preferCSSPageSize: true
    });
    
    console.log('PDF generated, size:', pdfBuffer.length);
    
    await browser.close();
    console.log('Browser closed');
    
    return pdfBuffer;
  } catch (error) {
    console.error('Error converting HTML to PDF:', error);
    throw new Error('Failed to convert HTML to PDF: ' + error.message);
  }
}

/**
 * Convert JSON report data directly to PDF
 * @param {Object} jsonData - Report data following the IRVM schema
 * @returns {Promise<Buffer>} PDF buffer
 */
async function jsonToPdf(jsonData) {
  try {
    const html = await jsonToHtml(jsonData);
    const pdfBuffer = await htmlToPdf(html);
    return pdfBuffer;
  } catch (error) {
    console.error('Error converting JSON to PDF:', error);
    throw new Error('Failed to convert JSON to PDF: ' + error.message);
  }
}

module.exports = {
  jsonToHtml,
  htmlToPdf,
  jsonToPdf
};

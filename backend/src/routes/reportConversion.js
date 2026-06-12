const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { jsonToHtml, htmlToPdf, jsonToPdf } = require('../services/reportConversion');

router.post('/json-to-html', protect, async (req, res) => {
  try {
    const { jsonData } = req.body;

    if (!jsonData) {
      return res.status(400).json({
        success: false,
        message: 'JSON data is required'
      });
    }

    const html = await jsonToHtml(jsonData);

    res.json({
      success: true,
      data: {
        html,
        format: 'html'
      }
    });
  } catch (error) {
    console.error('Error in JSON to HTML conversion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert JSON to HTML',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/report-conversion/html-to-pdf
 * @desc    Convert HTML to PDF
 * @access  Public (temporarily disabled auth for testing)
 */
router.post('/html-to-pdf', protect, async (req, res) => {
  try {
    const { html } = req.body;

    if (!html) {
      return res.status(400).json({
        success: false,
        message: 'HTML content is required'
      });
    }

    const pdfBuffer = await htmlToPdf(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in HTML to PDF conversion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert HTML to PDF',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/report-conversion/json-to-pdf
 * @desc    Convert JSON report data directly to PDF
 * @access  Public (temporarily disabled auth for testing)
 */
router.post('/json-to-pdf', protect, async (req, res) => {
  try {
    const { jsonData } = req.body;

    if (!jsonData) {
      return res.status(400).json({
        success: false,
        message: 'JSON data is required'
      });
    }

    const pdfBuffer = await jsonToPdf(jsonData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in JSON to PDF conversion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert JSON to PDF',
      error: error.message
    });
  }
});

module.exports = router;

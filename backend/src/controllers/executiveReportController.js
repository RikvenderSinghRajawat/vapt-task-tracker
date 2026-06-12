const ejs = require('ejs');
const path = require('path');
const mongoose = require('mongoose');
const { htmlToPdf } = require('../services/reportConversion');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'templates', 'executive-report.ejs');
const CSS_PATH = path.join(__dirname, '..', '..', 'templates', 'executive-report.css');

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];
const STATUS_GROUPS = {
  open: ['open', 'reopened'],
  in_progress: ['in_progress', 'under_review'],
  resolved: ['resolved', 'closed', 'fixed'],
  accepted_risk: ['accepted_risk'],
  other: ['duplicate', 'rejected', 'deferred', 'false_positive'],
};

const generateExecutiveReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const Project = mongoose.model('Project');
    const Finding = mongoose.model('Finding');

    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const findings = await Finding.find({ project: projectId, deletedAt: null })
      .populate('createdBy', 'name')
      .populate('assignee', 'name')
      .sort({ severity: 1, severityScore: -1 })
      .lean();

    // Statistics
    const severityDist = {};
    for (const sev of SEVERITY_ORDER) severityDist[sev] = 0;
    for (const f of findings) {
      if (severityDist[f.severity] !== undefined) severityDist[f.severity]++;
    }

    const statusDist = {};
    for (const group of Object.keys(STATUS_GROUPS)) statusDist[group] = 0;
    for (const f of findings) {
      for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
        if (statuses.includes(f.status)) { statusDist[group]++; break; }
      }
    }

    // Chart data — severity as percentage for bar widths
    const total = findings.length || 1;
    const severityChart = SEVERITY_ORDER.map(sev => ({
      severity: sev,
      count: severityDist[sev],
      pct: Math.round((severityDist[sev] / total) * 100),
    }));

    const statusChart = Object.entries(statusDist).map(([group, count]) => ({
      group: group.replace(/_/g, ' '),
      count,
      pct: Math.round((count / total) * 100),
    }));

    // Top critical/high findings (limit 25)
    const topFindings = findings
      .filter(f => f.severity === 'critical' || f.severity === 'high')
      .slice(0, 25);

    // Compute overall risk score: weighted average
    const weights = { critical: 10, high: 7.5, medium: 5, low: 2.5, info: 0 };
    let weightedSum = 0;
    for (const f of findings) {
      weightedSum += weights[f.severity] || 0;
    }
    const overallRiskScore = total > 0 ? Math.round((weightedSum / (total * 10)) * 100) : 0;

    // Determine risk level
    let riskLevel = 'Low';
    if (overallRiskScore >= 70) riskLevel = 'Critical';
    else if (overallRiskScore >= 50) riskLevel = 'High';
    else if (overallRiskScore >= 30) riskLevel = 'Medium';

    const templateData = {
      css: '',
      project: {
        name: project.name,
        code: project.code,
        assessmentType: project.assessmentType || 'VAPT',
        organization: project.organization,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        scope: project.scope,
      },
      summary: {
        total,
        critical: severityDist.critical,
        high: severityDist.high,
        medium: severityDist.medium,
        low: severityDist.low,
        info: severityDist.info,
        open: statusDist.open,
        inProgress: statusDist.in_progress,
        resolved: statusDist.resolved,
        acceptedRisk: statusDist.accepted_risk,
      },
      overallRiskScore,
      riskLevel,
      severityChart,
      statusChart,
      topFindings,
      findings,
      generatedAt: new Date(),
      generatedBy: req.user?.name || 'System',
      reportTitle: `Executive VAPT Report - ${project.name}`,
    };

    const fs = require('fs');
    if (!fs.existsSync(TEMPLATE_PATH)) throw new Error('Executive report template not found');
    if (!fs.existsSync(CSS_PATH)) throw new Error('Executive report CSS not found');

    templateData.css = fs.readFileSync(CSS_PATH, 'utf-8');
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    const html = ejs.render(template, templateData);

    // Check if user wants PDF or HTML preview
    if (req.query.preview === 'true') {
      return res.status(200).send(html);
    }

    const pdfBuffer = await htmlToPdf(html);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Executive_Report_${project.code}_${new Date().toISOString().slice(0,10)}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    res.end(pdfBuffer);
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { generateExecutiveReport };

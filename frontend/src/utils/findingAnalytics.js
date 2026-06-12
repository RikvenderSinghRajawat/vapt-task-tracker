/**
 * Finding Analytics Utilities
 * - Duplicate Detection Engine
 * - Risk Scoring Algorithm
 * - Auto-tagging based on keywords
 */

// ==================== DUPLICATE DETECTION ====================

/**
 * Calculate string similarity using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score (0-1)
 */
export const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Levenshtein distance
  const matrix = [];
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
};

/**
 * Calculate cosine similarity between two texts
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} - Similarity score (0-1)
 */
export const calculateCosineSimilarity = (text1, text2) => {
  if (!text1 || !text2) return 0;
  
  const tokenize = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);
  };
  
  const words1 = tokenize(text1);
  const words2 = tokenize(text2);
  
  const freq1 = {};
  const freq2 = {};
  const allWords = new Set();
  
  words1.forEach(w => {
    freq1[w] = (freq1[w] || 0) + 1;
    allWords.add(w);
  });
  
  words2.forEach(w => {
    freq2[w] = (freq2[w] || 0) + 1;
    allWords.add(w);
  });
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  allWords.forEach(word => {
    const f1 = freq1[word] || 0;
    const f2 = freq2[word] || 0;
    dotProduct += f1 * f2;
    mag1 += f1 * f1;
    mag2 += f2 * f2;
  });
  
  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
};

/**
 * Find potential duplicate findings
 * @param {Object} finding - The finding to check
 * @param {Array} allFindings - Array of all findings to compare against
 * @param {Object} options - Configuration options
 * @returns {Array} - Array of potential duplicates with scores
 */
export const findDuplicates = (finding, allFindings, options = {}) => {
  const {
    titleThreshold = 0.7,
    descriptionThreshold = 0.6,
    overallThreshold = 0.65,
    maxResults = 5,
  } = options;
  
  const duplicates = [];
  
  allFindings.forEach(other => {
    if (finding.id === other.id) return;
    if (finding.projectId !== other.projectId) return; // Only check same project
    
    const titleSim = calculateSimilarity(
      finding.title || finding.name,
      other.title || other.name
    );
    
    const descSim = calculateCosineSimilarity(
      finding.description || '',
      other.description || ''
    );
    
    // Weight title more heavily
    const overallScore = (titleSim * 0.6) + (descSim * 0.4);
    
    if (titleSim >= titleThreshold || 
        descSim >= descriptionThreshold || 
        overallScore >= overallThreshold) {
      duplicates.push({
        finding: other,
        titleSimilarity: titleSim,
        descriptionSimilarity: descSim,
        overallScore,
        reasons: [
          titleSim >= titleThreshold && 'Similar title',
          descSim >= descriptionThreshold && 'Similar description',
        ].filter(Boolean),
      });
    }
  });
  
  // Sort by overall score
  duplicates.sort((a, b) => b.overallScore - a.overallScore);
  
  return duplicates.slice(0, maxResults);
};

/**
 * Batch check for duplicates in a project
 * @param {Array} findings - All findings in project
 * @returns {Object} - Map of finding IDs to their duplicates
 */
export const batchFindDuplicates = (findings) => {
  const duplicatesMap = {};
  
  findings.forEach(finding => {
    const duplicates = findDuplicates(finding, findings, {
      titleThreshold: 0.75,
      descriptionThreshold: 0.65,
      overallThreshold: 0.7,
    });
    
    if (duplicates.length > 0) {
      duplicatesMap[finding.id] = duplicates;
    }
  });
  
  return duplicatesMap;
};

// ==================== RISK SCORING ====================

/**
 * Severity weights for risk calculation
 */
const SEVERITY_WEIGHTS = {
  critical: 10,
  high: 7,
  medium: 4,
  low: 2,
  info: 1,
};

/**
 * Status risk factors
 */
const STATUS_FACTORS = {
  open: 1.0,
  'in-progress': 0.7,
  'fix-verification': 0.4,
  closed: 0.0,
  'false-positive': 0.0,
};

/**
 * Age risk multipliers
 */
const AGE_MULTIPLIERS = [
  { days: 30, multiplier: 1.0 },
  { days: 60, multiplier: 1.2 },
  { days: 90, multiplier: 1.5 },
  { days: 180, multiplier: 2.0 },
  { days: Infinity, multiplier: 3.0 },
];

/**
 * Calculate individual finding risk score
 * @param {Object} finding - Finding object
 * @returns {Object} - Risk score details
 */
export const calculateFindingRisk = (finding) => {
  const severity = (finding.severity || 'info').toLowerCase();
  const status = (finding.status || 'open').toLowerCase();
  
  // Base score from severity
  let baseScore = SEVERITY_WEIGHTS[severity] || 1;
  
  // Apply status factor
  const statusFactor = STATUS_FACTORS[status] || 1.0;
  let adjustedScore = baseScore * statusFactor;
  
  // Apply age multiplier
  let ageMultiplier = 1.0;
  if (finding.createdAt) {
    const created = new Date(finding.createdAt);
    const now = new Date();
    const daysOpen = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    
    for (const age of AGE_MULTIPLIERS) {
      if (daysOpen <= age.days) {
        ageMultiplier = age.multiplier;
        break;
      }
    }
    
    adjustedScore *= ageMultiplier;
  }
  
  // Cap at 100
  const finalScore = Math.min(Math.round(adjustedScore * 10) / 10, 100);
  
  return {
    score: finalScore,
    baseScore,
    severity,
    status,
    statusFactor,
    ageMultiplier,
    maxPossible: 100,
    riskLevel: getRiskLevel(finalScore),
  };
};

/**
 * Get risk level from score
 * @param {number} score - Risk score
 * @returns {string} - Risk level
 */
const getRiskLevel = (score) => {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  if (score >= 10) return 'low';
  return 'minimal';
};

/**
 * Calculate project risk score
 * @param {Array} findings - All findings in project
 * @returns {Object} - Project risk details
 */
export const calculateProjectRisk = (findings) => {
  if (!findings || findings.length === 0) {
    return {
      overallScore: 0,
      level: 'minimal',
      breakdown: {},
      metrics: {
        totalFindings: 0,
        openFindings: 0,
        criticalOpen: 0,
        highOpen: 0,
        averageAge: 0,
      },
    };
  }
  
  let totalRiskScore = 0;
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const statusCounts = { open: 0, 'in-progress': 0, closed: 0 };
  let totalAge = 0;
  let criticalOpen = 0;
  let highOpen = 0;
  const now = new Date();
  
  findings.forEach(finding => {
    const risk = calculateFindingRisk(finding);
    totalRiskScore += risk.score;
    
    severityCounts[risk.severity] = (severityCounts[risk.severity] || 0) + 1;
    statusCounts[risk.status] = (statusCounts[risk.status] || 0) + 1;
    
    if (finding.status?.toLowerCase() === 'open') {
      if (risk.severity === 'critical') criticalOpen++;
      if (risk.severity === 'high') highOpen++;
    }
    
    if (finding.createdAt) {
      const age = (now - new Date(finding.createdAt)) / (1000 * 60 * 60 * 24);
      totalAge += age;
    }
  });
  
  // Calculate weighted average
  const averageScore = totalRiskScore / findings.length;
  
  // Apply project-level multipliers
  let projectScore = averageScore;
  
  // Critical findings have outsized impact
  if (criticalOpen > 0) {
    projectScore *= (1 + criticalOpen * 0.2);
  }
  
  // High findings impact
  if (highOpen > 0) {
    projectScore *= (1 + highOpen * 0.1);
  }
  
  // Cap at 100
  const finalScore = Math.min(Math.round(projectScore), 100);
  
  return {
    overallScore: finalScore,
    level: getRiskLevel(finalScore),
    breakdown: severityCounts,
    metrics: {
      totalFindings: findings.length,
      openFindings: statusCounts.open || 0,
      criticalOpen,
      highOpen,
      averageAge: Math.round(totalAge / findings.length),
    },
    severityDistribution: severityCounts,
    statusDistribution: statusCounts,
  };
};

/**
 * Calculate SLA breach status
 * @param {Object} finding - Finding object
 * @param {Object} slaConfig - SLA configuration
 * @returns {Object} - SLA status
 */
export const calculateSLAStatus = (finding, slaConfig = {}) => {
  const defaults = {
    critical: 7,
    high: 14,
    medium: 30,
    low: 60,
    info: 90,
  };
  
  const config = { ...defaults, ...slaConfig };
  const severity = (finding.severity || 'info').toLowerCase();
  const allowedDays = config[severity] || 30;
  
  if (!finding.createdAt || finding.status === 'closed') {
    return { isBreached: false, daysRemaining: null, percentUsed: 0 };
  }
  
  const created = new Date(finding.createdAt);
  const now = new Date();
  const daysOpen = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  const daysRemaining = allowedDays - daysOpen;
  const percentUsed = Math.min((daysOpen / allowedDays) * 100, 100);
  
  return {
    isBreached: daysOpen > allowedDays,
    daysRemaining,
    daysOpen,
    allowedDays,
    percentUsed,
    isAtRisk: percentUsed > 80 && daysRemaining > 0,
  };
};

// ==================== AUTO-TAGGING ====================

/**
 * Vulnerability keywords for auto-tagging
 */
const VULNERABILITY_KEYWORDS = {
  'XSS': ['xss', 'cross-site scripting', 'script injection', 'javascript injection', 'dom manipulation'],
  'SQL Injection': ['sql injection', 'sqli', 'sql query', 'database injection', 'blind sql'],
  'Authentication': ['authentication', 'auth bypass', 'session', 'cookie', 'jwt', 'oauth', 'sso'],
  'Authorization': ['authorization', 'privilege escalation', 'access control', 'rbac', 'permission'],
  'CSRF': ['csrf', 'cross-site request forgery', 'request forgery'],
  'SSRF': ['ssrf', 'server-side request forgery'],
  'XXE': ['xxe', 'xml external entity', 'xml injection'],
  'LFI/RFI': ['lfi', 'rfi', 'local file inclusion', 'remote file inclusion', 'path traversal', 'directory traversal'],
  'Command Injection': ['command injection', 'rce', 'remote code execution', 'os command', 'shell injection'],
  'Information Disclosure': ['information disclosure', 'sensitive data', 'data leak', 'verbose error', 'stack trace'],
  'Cryptography': ['cryptography', 'encryption', 'weak cipher', 'ssl', 'tls', 'certificate', 'hash'],
  'Configuration': ['configuration', 'misconfiguration', 'default credential', 'unnecessary feature'],
  'Input Validation': ['input validation', 'sanitization', 'validation', 'filter bypass'],
  'Business Logic': ['business logic', 'workflow bypass', 'race condition', 'logic flaw'],
};

/**
 * Auto-tag finding based on title and description
 * @param {string} title - Finding title
 * @param {string} description - Finding description
 * @returns {Array} - Array of suggested tags
 */
export const autoTagFinding = (title, description) => {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  const tags = [];
  const scores = {};
  
  Object.entries(VULNERABILITY_KEYWORDS).forEach(([tag, keywords]) => {
    let score = 0;
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = (text.match(regex) || []).length;
      if (matches > 0) {
        score += matches;
        // Title matches count more
        if (title && title.toLowerCase().includes(keyword)) {
          score += 2;
        }
      }
    });
    
    if (score > 0) {
      scores[tag] = score;
    }
  });
  
  // Sort by score and return top tags
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  return sorted.map(([tag, score]) => ({
    tag,
    confidence: Math.min(score / 5, 1),
    score,
  }));
};

/**
 * Get suggested tags with confidence scores
 * @param {Object} finding - Finding object
 * @returns {Array} - Suggested tags
 */
export const getSuggestedTags = (finding) => {
  return autoTagFinding(finding.title || finding.name, finding.description);
};

// ==================== EXPORTS ====================

export default {
  // Duplicate Detection
  calculateSimilarity,
  calculateCosineSimilarity,
  findDuplicates,
  batchFindDuplicates,
  
  // Risk Scoring
  calculateFindingRisk,
  calculateProjectRisk,
  calculateSLAStatus,
  
  // Auto-tagging
  autoTagFinding,
  getSuggestedTags,
  
  // Constants
  SEVERITY_WEIGHTS,
  VULNERABILITY_KEYWORDS,
};

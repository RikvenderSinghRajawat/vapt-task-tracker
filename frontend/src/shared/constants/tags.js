/**
 * Tag System Constants - Predefined and custom tags
 */

// Predefined vulnerability tags
export const PREDEFINED_TAGS = {
  // Vulnerability Types
  XSS: {
    id: 'xss',
    name: 'XSS',
    color: '#F0883E',
    description: 'Cross-Site Scripting',
    category: 'vulnerability'
  },
  SQL_INJECTION: {
    id: 'sql-injection',
    name: 'SQL Injection',
    color: '#D73A49',
    description: 'SQL Injection vulnerability',
    category: 'vulnerability'
  },
  CSRF: {
    id: 'csrf',
    name: 'CSRF',
    color: '#F0883E',
    description: 'Cross-Site Request Forgery',
    category: 'vulnerability'
  },
  IDOR: {
    id: 'idor',
    name: 'IDOR',
    color: '#F0883E',
    description: 'Insecure Direct Object Reference',
    category: 'vulnerability'
  },
  AUTH_BYPASS: {
    id: 'auth-bypass',
    name: 'Auth Bypass',
    color: '#D73A49',
    description: 'Authentication bypass',
    category: 'vulnerability'
  },
  INFO_DISCLOSURE: {
    id: 'info-disclosure',
    name: 'Info Disclosure',
    color: '#DBAB09',
    description: 'Information disclosure',
    category: 'vulnerability'
  },
  MISCONFIGURATION: {
    id: 'misconfiguration',
    name: 'Misconfiguration',
    color: '#DBAB09',
    description: 'Security misconfiguration',
    category: 'vulnerability'
  },
  
  // Severity Tags
  CRITICAL: {
    id: 'critical',
    name: 'Critical',
    color: '#D73A49',
    description: 'Critical severity',
    category: 'severity'
  },
  HIGH: {
    id: 'high',
    name: 'High',
    color: '#F0883E',
    description: 'High severity',
    category: 'severity'
  },
  MEDIUM: {
    id: 'medium',
    name: 'Medium',
    color: '#DBAB09',
    description: 'Medium severity',
    category: 'severity'
  },
  LOW: {
    id: 'low',
    name: 'Low',
    color: '#3FB950',
    description: 'Low severity',
    category: 'severity'
  },
  
  // Status Tags
  OPEN: {
    id: 'open',
    name: 'Open',
    color: '#F0883E',
    description: 'Open finding',
    category: 'status'
  },
  IN_PROGRESS: {
    id: 'in-progress',
    name: 'In Progress',
    color: '#58A6FF',
    description: 'Fix in progress',
    category: 'status'
  },
  FIXED: {
    id: 'fixed',
    name: 'Fixed',
    color: '#3FB950',
    description: 'Fixed finding',
    category: 'status'
  },
  VERIFIED: {
    id: 'verified',
    name: 'Verified',
    color: '#8957E5',
    description: 'Fix verified',
    category: 'status'
  },
  
  // OWASP Categories
  INJECTION: {
    id: 'injection',
    name: 'Injection',
    color: '#D73A49',
    description: 'OWASP A01: Injection',
    category: 'owasp'
  },
  BROKEN_AUTH: {
    id: 'broken-auth',
    name: 'Broken Auth',
    color: '#D73A49',
    description: 'OWASP A02: Broken Authentication',
    category: 'owasp'
  },
  SENSITIVE_DATA: {
    id: 'sensitive-data',
    name: 'Sensitive Data',
    color: '#F0883E',
    description: 'OWASP A03: Sensitive Data Exposure',
    category: 'owasp'
  },
  XXE: {
    id: 'xxe',
    name: 'XXE',
    color: '#F0883E',
    description: 'OWASP A04: XML External Entities',
    category: 'owasp'
  },
  BROKEN_ACCESS: {
    id: 'broken-access',
    name: 'Broken Access',
    color: '#F0883E',
    description: 'OWASP A05: Broken Access Control',
    category: 'owasp'
  },
  SECURITY_MISCONFIG: {
    id: 'security-misconfig',
    name: 'Misconfiguration',
    color: '#DBAB09',
    description: 'OWASP A06: Security Misconfiguration',
    category: 'owasp'
  },
  XSS_OWASP: {
    id: 'xss-owasp',
    name: 'XSS',
    color: '#DBAB09',
    description: 'OWASP A07: Cross-Site Scripting',
    category: 'owasp'
  },
  INSECURE_DESERIALIZATION: {
    id: 'insecure-deserialization',
    name: 'Deserialization',
    color: '#DBAB09',
    description: 'OWASP A08: Insecure Deserialization',
    category: 'owasp'
  },
  VULNERABLE_COMPONENTS: {
    id: 'vulnerable-components',
    name: 'Vulnerable Components',
    color: '#DBAB09',
    description: 'OWASP A09: Vulnerable Components',
    category: 'owasp'
  },
  INSUFFICIENT_LOGGING: {
    id: 'insufficient-logging',
    name: 'Logging',
    color: '#DBAB09',
    description: 'OWASP A10: Insufficient Logging',
    category: 'owasp'
  },
  
  // Attack Vectors
  API: {
    id: 'api',
    name: 'API',
    color: '#58A6FF',
    description: 'API endpoint',
    category: 'vector'
  },
  WEB: {
    id: 'web',
    name: 'Web',
    color: '#58A6FF',
    description: 'Web application',
    category: 'vector'
  },
  MOBILE: {
    id: 'mobile',
    name: 'Mobile',
    color: '#58A6FF',
    description: 'Mobile application',
    category: 'vector'
  },
  NETWORK: {
    id: 'network',
    name: 'Network',
    color: '#58A6FF',
    description: 'Network layer',
    category: 'vector'
  },
  
  // Technology
  REACT: {
    id: 'react',
    name: 'React',
    color: '#61DAFB',
    description: 'React application',
    category: 'tech'
  },
  NODEJS: {
    id: 'nodejs',
    name: 'Node.js',
    color: '#339933',
    description: 'Node.js backend',
    category: 'tech'
  },
  PYTHON: {
    id: 'python',
    name: 'Python',
    color: '#3776AB',
    description: 'Python application',
    category: 'tech'
  },
  JAVA: {
    id: 'java',
    name: 'Java',
    color: '#007396',
    description: 'Java application',
    category: 'tech'
  },
  DOTNET: {
    id: 'dotnet',
    name: '.NET',
    color: '#512BD4',
    description: '.NET application',
    category: 'tech'
  },
  PHP: {
    id: 'php',
    name: 'PHP',
    color: '#777BB4',
    description: 'PHP application',
    category: 'tech'
  },
  
  // Compliance
  GDPR: {
    id: 'gdpr',
    name: 'GDPR',
    color: '#1E6FEB',
    description: 'GDPR compliance',
    category: 'compliance'
  },
  PCI_DSS: {
    id: 'pci-dss',
    name: 'PCI-DSS',
    color: '#1E6FEB',
    description: 'PCI-DSS compliance',
    category: 'compliance'
  },
  HIPAA: {
    id: 'hipaa',
    name: 'HIPAA',
    color: '#1E6FEB',
    description: 'HIPAA compliance',
    category: 'compliance'
  },
  SOC2: {
    id: 'soc2',
    name: 'SOC2',
    color: '#1E6FEB',
    description: 'SOC2 compliance',
    category: 'compliance'
  },
  
  // Priority
  P0: {
    id: 'p0',
    name: 'P0',
    color: '#D73A49',
    description: 'Critical priority',
    category: 'priority'
  },
  P1: {
    id: 'p1',
    name: 'P1',
    color: '#F0883E',
    description: 'High priority',
    category: 'priority'
  },
  P2: {
    id: 'p2',
    name: 'P2',
    color: '#DBAB09',
    description: 'Medium priority',
    category: 'priority'
  },
  
  // Special
  FALSE_POSITIVE: {
    id: 'false-positive',
    name: 'False Positive',
    color: '#6E7681',
    description: 'Marked as false positive',
    category: 'special'
  },
  OUT_OF_SCOPE: {
    id: 'out-of-scope',
    name: 'Out of Scope',
    color: '#6E7681',
    description: 'Out of testing scope',
    category: 'special'
  },
  DUPLICATE: {
    id: 'duplicate',
    name: 'Duplicate',
    color: '#6E7681',
    description: 'Duplicate finding',
    category: 'special'
  },
  RETEST_REQUIRED: {
    id: 'retest-required',
    name: 'Retest Required',
    color: '#8957E5',
    description: 'Needs retesting',
    category: 'special'
  }
};

// Tag categories for grouping
export const TAG_CATEGORIES = {
  vulnerability: { label: 'Vulnerability', color: '#D73A49' },
  severity: { label: 'Severity', color: '#F0883E' },
  status: { label: 'Status', color: '#3FB950' },
  owasp: { label: 'OWASP', color: '#58A6FF' },
  vector: { label: 'Attack Vector', color: '#8957E5' },
  tech: { label: 'Technology', color: '#06B6D4' },
  compliance: { label: 'Compliance', color: '#1E6FEB' },
  priority: { label: 'Priority', color: '#DBAB09' },
  special: { label: 'Special', color: '#6E7681' }
};

/**
 * Get tag by ID
 */
export const getTagById = (id) => {
  return PREDEFINED_TAGS[id.toUpperCase().replace(/-/g, '_')] || null;
};

/**
 * Get tags by category
 */
export const getTagsByCategory = (category) => {
  return Object.values(PREDEFINED_TAGS).filter(tag => tag.category === category);
};

/**
 * Get all tags as array
 */
export const getAllTags = () => {
  return Object.values(PREDEFINED_TAGS);
};

/**
 * Search tags
 */
export const searchTags = (query) => {
  const q = query.toLowerCase();
  return Object.values(PREDEFINED_TAGS).filter(tag =>
    tag.name.toLowerCase().includes(q) ||
    tag.description.toLowerCase().includes(q)
  );
};

/**
 * Get suggested tags for text
 */
export const getSuggestedTags = (text) => {
  if (!text) return [];
  
  const suggestions = [];
  const lowerText = text.toLowerCase();
  
  // Check for vulnerability keywords
  if (lowerText.includes('sql') || lowerText.includes('injection')) {
    suggestions.push(PREDEFINED_TAGS.SQL_INJECTION);
  }
  if (lowerText.includes('xss') || lowerText.includes('script')) {
    suggestions.push(PREDEFINED_TAGS.XSS);
  }
  if (lowerText.includes('csrf') || lowerText.includes('forgery')) {
    suggestions.push(PREDEFINED_TAGS.CSRF);
  }
  if (lowerText.includes('idor') || lowerText.includes('direct object')) {
    suggestions.push(PREDEFINED_TAGS.IDOR);
  }
  if (lowerText.includes('auth') && (lowerText.includes('bypass') || lowerText.includes('weak'))) {
    suggestions.push(PREDEFINED_TAGS.AUTH_BYPASS);
  }
  if (lowerText.includes('info') || lowerText.includes('disclosure') || lowerText.includes('leak')) {
    suggestions.push(PREDEFINED_TAGS.INFO_DISCLOSURE);
  }
  if (lowerText.includes('misconfig') || lowerText.includes('header') || lowerText.includes('tls')) {
    suggestions.push(PREDEFINED_TAGS.MISCONFIGURATION);
  }
  
  // Check for technology
  if (lowerText.includes('api') || lowerText.includes('endpoint')) {
    suggestions.push(PREDEFINED_TAGS.API);
  }
  if (lowerText.includes('react')) {
    suggestions.push(PREDEFINED_TAGS.REACT);
  }
  if (lowerText.includes('node') || lowerText.includes('express')) {
    suggestions.push(PREDEFINED_TAGS.NODEJS);
  }
  
  return [...new Set(suggestions)];
};

/**
 * Validate tag format
 */
export const validateTag = (tag) => {
  if (typeof tag === 'string') {
    return tag.length >= 2 && tag.length <= 30 && /^[a-z0-9-]+$/i.test(tag);
  }
  
  if (typeof tag === 'object') {
    return tag.id && tag.name && tag.name.length >= 2 && tag.name.length <= 30;
  }
  
  return false;
};

/**
 * Normalize tag string
 */
export const normalizeTag = (tag) => {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

export default {
  PREDEFINED_TAGS,
  TAG_CATEGORIES,
  getTagById,
  getTagsByCategory,
  getAllTags,
  searchTags,
  getSuggestedTags,
  validateTag,
  normalizeTag
};

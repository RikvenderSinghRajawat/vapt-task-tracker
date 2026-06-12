/**
 * Finding Templates - OWASP-based predefined vulnerability formats
 */

export const OWASP_CATEGORIES = {
  INJECTION: {
    id: 'injection',
    name: 'Injection',
    description: 'SQL, NoSQL, OS Command, LDAP injection flaws',
    risk: 'critical',
    cwe: ['CWE-89', 'CWE-78', 'CWE-90']
  },
  BROKEN_AUTH: {
    id: 'broken_auth',
    name: 'Broken Authentication',
    description: 'Authentication/session management flaws',
    risk: 'critical',
    cwe: ['CWE-287', 'CWE-306', 'CWE-798']
  },
  SENSITIVE_DATA: {
    id: 'sensitive_data',
    name: 'Sensitive Data Exposure',
    description: 'Inadequate protection of sensitive data',
    risk: 'high',
    cwe: ['CWE-311', 'CWE-319', 'CWE-200']
  },
  XXE: {
    id: 'xxe',
    name: 'XML External Entities (XXE)',
    description: 'XML processors evaluating external entities',
    risk: 'high',
    cwe: ['CWE-611', 'CWE-776', 'CWE-827']
  },
  BROKEN_ACCESS: {
    id: 'broken_access',
    name: 'Broken Access Control',
    description: 'Restrictions on authenticated users not enforced',
    risk: 'critical',
    cwe: ['CWE-22', 'CWE-285', 'CWE-639']
  },
  SECURITY_MISCONFIG: {
    id: 'security_misconfig',
    name: 'Security Misconfiguration',
    description: 'Insecure default configurations, open cloud storage',
    risk: 'medium',
    cwe: ['CWE-16', 'CWE-200', 'CWE-548']
  },
  XSS: {
    id: 'xss',
    name: 'Cross-Site Scripting (XSS)',
    description: 'Untrusted data in web pages without validation',
    risk: 'high',
    cwe: ['CWE-79', 'CWE-87', 'CWE-941']
  },
  INSECURE_DESERIALIZATION: {
    id: 'insecure_deserialization',
    name: 'Insecure Deserialization',
    description: 'Untrusted data deserialized by application',
    risk: 'critical',
    cwe: ['CWE-502', 'CWE-915']
  },
  VULNERABLE_COMPONENTS: {
    id: 'vulnerable_components',
    name: 'Vulnerable Components',
    description: 'Components with known vulnerabilities',
    risk: 'medium',
    cwe: ['CWE-1035', 'CWE-937', 'CWE-1104']
  },
  INSUFFICIENT_LOGGING: {
    id: 'insufficient_logging',
    name: 'Insufficient Logging',
    description: 'Inadequate logging and monitoring',
    risk: 'medium',
    cwe: ['CWE-223', 'CWE-778', 'CWE-778']
  },
  SSRF: {
    id: 'ssrf',
    name: 'Server-Side Request Forgery',
    description: 'Server fetching remote resource without validation',
    risk: 'high',
    cwe: ['CWE-918']
  },
  CSRF: {
    id: 'csrf',
    name: 'Cross-Site Request Forgery',
    description: 'Forced actions on authenticated users',
    risk: 'high',
    cwe: ['CWE-352']
  },
  IDOR: {
    id: 'idor',
    name: 'Insecure Direct Object Reference',
    description: 'Access to objects via user-supplied input',
    risk: 'high',
    cwe: ['CWE-639', 'CWE-285']
  },
  BUSINESS_LOGIC: {
    id: 'business_logic',
    name: 'Business Logic Flaw',
    description: 'Flaws in application workflow or logic',
    risk: 'high',
    cwe: ['CWE-840', 'CWE-841']
  },
  CRYPTO: {
    id: 'crypto',
    name: 'Cryptographic Issues',
    description: 'Weak cryptography or implementation flaws',
    risk: 'high',
    cwe: ['CWE-327', 'CWE-326', 'CWE-321']
  }
};

/**
 * Predefined finding templates
 */
export const FINDING_TEMPLATES = [
  // SQL Injection
  {
    id: 'sql-injection-basic',
    category: 'injection',
    title: 'SQL Injection in {parameter} Parameter',
    severity: 'critical',
    cvssScore: 9.8,
    description: `The {parameter} parameter is vulnerable to SQL injection attacks. 

**Vulnerable URL:** {endpoint}

**Payload Used:** {payload}

The application fails to properly sanitize user input before including it in SQL queries, allowing attackers to manipulate database queries.`,
    impact: `An attacker can:
- Extract sensitive data from the database
- Modify or delete database records
- Execute administrative operations on the database
- Potentially gain shell access to the server`,
    remediation: `1. Use parameterized queries/prepared statements
2. Implement input validation and sanitization
3. Apply principle of least privilege to database accounts
4. Use ORM frameworks that handle parameterization automatically
5. Enable SQL injection detection at WAF level`,
    references: [
      'https://owasp.org/www-community/attacks/SQL_Injection',
      'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html'
    ],
    tags: ['sql-injection', 'injection', 'database', 'critical']
  },

  // XSS
  {
    id: 'xss-reflected',
    category: 'xss',
    title: 'Reflected Cross-Site Scripting (XSS) in {parameter}',
    severity: 'high',
    cvssScore: 7.5,
    description: `A reflected XSS vulnerability was discovered in the {parameter} parameter at {endpoint}.

**Payload:** {payload}

The application reflects user input in the response without proper encoding, allowing script injection.`,
    impact: `An attacker can:
- Steal user session cookies
- Perform actions on behalf of the victim
- Deface the application
- Redirect users to malicious sites
- Keylog user input`,
    remediation: `1. Encode all output based on context (HTML, JavaScript, URL, CSS)
2. Use Content Security Policy (CSP) headers
3. Implement X-XSS-Protection header
4. Validate and sanitize all user input
5. Use modern frameworks with auto-escaping`,
    references: [
      'https://owasp.org/www-community/attacks/xss/',
      'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html'
    ],
    tags: ['xss', 'reflected-xss', 'injection', 'javascript']
  },

  // Stored XSS
  {
    id: 'xss-stored',
    category: 'xss',
    title: 'Stored Cross-Site Scripting (XSS) in {location}',
    severity: 'high',
    cvssScore: 8.2,
    description: `A stored XSS vulnerability was discovered in the {location} functionality.

**Injection Point:** {endpoint}

User input is stored in the database and rendered to other users without proper sanitization.`,
    impact: `This is more severe than reflected XSS because:
- The payload persists and affects multiple users
- No user interaction required beyond visiting the page
- Can be used to build persistent malware distribution
- Difficult to detect and remove`,
    remediation: `1. Implement strict output encoding
2. Use HTML sanitization libraries (DOMPurify)
3. Apply Content Security Policy
4. Implement input validation at entry points
5. Regular security testing of stored content`,
    references: [
      'https://owasp.org/www-community/attacks/xss/',
      'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html'
    ],
    tags: ['xss', 'stored-xss', 'persistent', 'critical']
  },

  // Broken Authentication
  {
    id: 'weak-password-policy',
    category: 'broken_auth',
    title: 'Weak Password Policy',
    severity: 'medium',
    cvssScore: 5.3,
    description: `The application allows weak passwords that do not meet security best practices.

**Current Requirements:** {current_policy}

This allows users to set easily guessable passwords.`,
    impact: `An attacker can:
- Brute force user accounts
- Use credential stuffing attacks
- Easily guess common passwords
- Compromise user accounts`,
    remediation: `1. Enforce minimum password length (12+ characters)
2. Require mixed character types
3. Check against known breached passwords (Have I Been Pwned API)
4. Implement account lockout after failed attempts
5. Consider implementing MFA`,
    references: [
      'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html',
      'https://pages.nist.gov/800-63-3/sp800-63b.html'
    ],
    tags: ['authentication', 'password', 'policy']
  },

  // IDOR
  {
    id: 'idor-basic',
    category: 'idor',
    title: 'Insecure Direct Object Reference (IDOR) in {endpoint}',
    severity: 'high',
    cvssScore: 7.5,
    description: `The application exposes direct references to internal objects (database keys, files) without proper access control.

**Vulnerable Endpoint:** {endpoint}

By manipulating the {parameter} parameter, users can access other users' data.`,
    impact: `An attacker can:
- Access unauthorized data
- Modify other users' information
- Delete records belonging to others
- Bypass business logic restrictions`,
    remediation: `1. Implement proper access control checks
2. Use indirect object references (UUIDs instead of sequential IDs)
3. Validate user permissions on every request
4. Implement defense in depth
5. Log and monitor access to sensitive objects`,
    references: [
      'https://owasp.org/www-project-top-ten/2017/A5_2017-Broken_Access_Control',
      'https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html'
    ],
    tags: ['idor', 'access-control', 'authorization', 'data-exposure']
  },

  // CSRF
  {
    id: 'csrf-basic',
    category: 'csrf',
    title: 'Cross-Site Request Forgery (CSRF) on {endpoint}',
    severity: 'high',
    cvssScore: 6.8,
    description: `The {endpoint} endpoint lacks CSRF protection, allowing attackers to perform actions on behalf of authenticated users.

**Affected Actions:** {actions}

No anti-CSRF tokens are present in the request.`,
    impact: `An attacker can:
- Change user email/password
- Perform unauthorized transactions
- Modify user settings
- Delete user data`,
    remediation: `1. Implement anti-CSRF tokens (synchronizer tokens)
2. Use SameSite cookie attribute
3. Implement double-submit cookie pattern
4. Validate Referer/Origin headers
5. Require re-authentication for sensitive actions`,
    references: [
      'https://owasp.org/www-community/attacks/csrf',
      'https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html'
    ],
    tags: ['csrf', 'session', 'authentication']
  },

  // Security Misconfiguration
  {
    id: 'info-disclosure-headers',
    category: 'security_misconfig',
    title: 'Information Disclosure via HTTP Headers',
    severity: 'low',
    cvssScore: 3.7,
    description: `The server discloses sensitive information through HTTP response headers:

**Headers Found:**
{headers}

This information can aid attackers in targeting specific vulnerabilities.`,
    impact: `An attacker can:
- Identify server technology and version
- Target known vulnerabilities for specific versions
- Gather intelligence for targeted attacks`,
    remediation: `1. Remove or modify Server header
2. Remove X-Powered-By header
3. Configure security headers (HSTS, CSP, X-Frame-Options)
4. Implement custom error pages
5. Disable unnecessary headers`,
    references: [
      'https://owasp.org/www-project-top-ten/2017/A6_2017-Security_Misconfiguration',
      'https://securityheaders.com/'
    ],
    tags: ['misconfiguration', 'headers', 'information-disclosure']
  },

  // Sensitive Data Exposure
  {
    id: 'plaintext-passwords',
    category: 'sensitive_data',
    title: 'Plaintext Password Storage/Transmission',
    severity: 'critical',
    cvssScore: 9.1,
    description: `The application stores or transmits passwords in plaintext format.

**Evidence:** {evidence}

This represents a severe security vulnerability.`,
    impact: `An attacker can:
- Read all user passwords if database is compromised
- Perform man-in-the-middle attacks
- Use credentials for attacks on other systems`,
    remediation: `1. Use strong password hashing (bcrypt, Argon2, PBKDF2)
2. Never store passwords in plaintext
3. Use HTTPS for all communications
4. Implement proper key management
5. Regular security audits`,
    references: [
      'https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure',
      'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html'
    ],
    tags: ['password', 'plaintext', 'encryption', 'critical']
  },

  // Missing Security Headers
  {
    id: 'missing-security-headers',
    category: 'security_misconfig',
    title: 'Missing Security Headers',
    severity: 'medium',
    cvssScore: 5.0,
    description: `Critical security headers are missing from HTTP responses:

**Missing Headers:**
{missing_headers}

These headers provide important security protections.`,
    impact: `Without these headers, the application is more vulnerable to:
- Clickjacking attacks
- XSS attacks
- Man-in-the-middle attacks
- Content sniffing attacks`,
    remediation: `1. Implement Content-Security-Policy
2. Add X-Frame-Options: DENY or SAMEORIGIN
3. Add X-Content-Type-Options: nosniff
4. Add Strict-Transport-Security (HSTS)
5. Add X-XSS-Protection (legacy browsers)`,
    references: [
      'https://owasp.org/www-project-secure-headers/',
      'https://securityheaders.com/'
    ],
    tags: ['headers', 'misconfiguration', 'csp', 'hsts']
  }
];

/**
 * Get template by ID
 */
export const getTemplateById = (id) => {
  return FINDING_TEMPLATES.find(t => t.id === id) || null;
};

/**
 * Get templates by category
 */
export const getTemplatesByCategory = (category) => {
  return FINDING_TEMPLATES.filter(t => t.category === category);
};

/**
 * Get all categories
 */
export const getCategories = () => {
  return Object.values(OWASP_CATEGORIES);
};

/**
 * Search templates
 */
export const searchTemplates = (query) => {
  const q = query.toLowerCase();
  return FINDING_TEMPLATES.filter(t => 
    t.title.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.includes(q)) ||
    t.category.includes(q)
  );
};

/**
 * Apply template variables
 */
export const applyTemplate = (template, variables = {}) => {
  let result = { ...template };
  
  ['title', 'description', 'impact', 'remediation'].forEach(field => {
    if (result[field]) {
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{${key}}`, 'g');
        result[field] = result[field].replace(regex, variables[key] || `{${key}}`);
      });
    }
  });
  
  return result;
};

export default {
  OWASP_CATEGORIES,
  FINDING_TEMPLATES,
  getTemplateById,
  getTemplatesByCategory,
  getCategories,
  searchTemplates,
  applyTemplate
};

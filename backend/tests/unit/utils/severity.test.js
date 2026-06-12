require('dotenv').config({ path: '.env' });

describe('Severity Utils', () => {
  let severityUtils;

  beforeEach(() => {
    severityUtils = require('../../../src/utils/severity');
  });

  describe('CVSS_SEVERITY_MAP', () => {
    it('should define severity thresholds in order', () => {
      expect(severityUtils.CVSS_SEVERITY_MAP).toEqual([
        { max: 0.0, label: 'info' },
        { max: 3.9, label: 'low' },
        { max: 6.9, label: 'medium' },
        { max: 8.9, label: 'high' },
        { max: 10.0, label: 'critical' },
      ]);
    });
  });

  describe('cvssToSeverity(cvssScore)', () => {
    it('should return "info" for score 0.0', () => {
      expect(severityUtils.cvssToSeverity(0.0)).toBe('info');
    });

    it('should return "low" for score 3.9', () => {
      expect(severityUtils.cvssToSeverity(3.9)).toBe('low');
    });

    it('should return "medium" for score 4.0', () => {
      expect(severityUtils.cvssToSeverity(4.0)).toBe('medium');
    });

    it('should return "medium" for score 6.9', () => {
      expect(severityUtils.cvssToSeverity(6.9)).toBe('medium');
    });

    it('should return "high" for score 7.0', () => {
      expect(severityUtils.cvssToSeverity(7.0)).toBe('high');
    });

    it('should return "high" for score 8.9', () => {
      expect(severityUtils.cvssToSeverity(8.9)).toBe('high');
    });

    it('should return "critical" for score 9.0', () => {
      expect(severityUtils.cvssToSeverity(9.0)).toBe('critical');
    });

    it('should return "critical" for score 10.0', () => {
      expect(severityUtils.cvssToSeverity(10.0)).toBe('critical');
    });

    it('should return null for score < 0', () => {
      expect(severityUtils.cvssToSeverity(-0.1)).toBeNull();
    });

    it('should return null for score > 10', () => {
      expect(severityUtils.cvssToSeverity(10.1)).toBeNull();
    });

    it('should return null for null', () => {
      expect(severityUtils.cvssToSeverity(null)).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(severityUtils.cvssToSeverity(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(severityUtils.cvssToSeverity('')).toBeNull();
    });

    it('should return null for non-numeric string', () => {
      expect(severityUtils.cvssToSeverity('abc')).toBeNull();
    });

    it('should handle string numbers', () => {
      expect(severityUtils.cvssToSeverity('7.5')).toBe('high');
    });

    it('should return "medium" for score in the middle of medium range', () => {
      expect(severityUtils.cvssToSeverity(5.5)).toBe('medium');
    });

    it('should return "low" for score in low range', () => {
      expect(severityUtils.cvssToSeverity(2.0)).toBe('low');
    });
  });

  describe('severityFromBody(body)', () => {
    it('should return severity from cvssScore', () => {
      const result = severityUtils.severityFromBody({ cvssScore: 7.5 });
      expect(result).toBe('high');
    });

    it('should return severity from cvss.score when cvssScore is absent', () => {
      const result = severityUtils.severityFromBody({ cvss: { score: 4.5 } });
      expect(result).toBe('medium');
    });

    it('should return severity from body.severity when score fields absent', () => {
      const result = severityUtils.severityFromBody({ severity: 'low' });
      expect(result).toBe('low');
    });

    it('should prefer cvssScore over cvss.score', () => {
      const result = severityUtils.severityFromBody({
        cvssScore: 9.5,
        cvss: { score: 3.0 },
      });
      expect(result).toBe('critical');
    });

    it('should fall back to cvss.score when cvssScore is empty string', () => {
      const result = severityUtils.severityFromBody({
        cvssScore: '',
        cvss: { score: 6.5 },
      });
      expect(result).toBe('medium');
    });

    it('should fall back to body.severity when cvssScore is null', () => {
      const result = severityUtils.severityFromBody({
        cvssScore: null,
        severity: 'high',
      });
      expect(result).toBe('high');
    });

    it('should return "medium" for an empty body', () => {
      const result = severityUtils.severityFromBody({});
      expect(result).toBe('medium');
    });

    it('should return "medium" when cvssScore is out of range', () => {
      const result = severityUtils.severityFromBody({ cvssScore: 15 });
      expect(result).toBe('medium');
    });

    it('should return severity from body.severity when cvss.score is undefined', () => {
      const result = severityUtils.severityFromBody({
        cvss: {},
        severity: 'critical',
      });
      expect(result).toBe('critical');
    });
  });

  describe('getSeverityColor(severity)', () => {
    it('should return red for critical', () => {
      expect(severityUtils.getSeverityColor('critical')).toBe('#dc2626');
    });

    it('should return orange for high', () => {
      expect(severityUtils.getSeverityColor('high')).toBe('#ea580c');
    });

    it('should return yellow for medium', () => {
      expect(severityUtils.getSeverityColor('medium')).toBe('#ca8a04');
    });

    it('should return green for low', () => {
      expect(severityUtils.getSeverityColor('low')).toBe('#16a34a');
    });

    it('should return cyan for info', () => {
      expect(severityUtils.getSeverityColor('info')).toBe('#0891b2');
    });

    it('should return slate for unknown severity', () => {
      expect(severityUtils.getSeverityColor('unknown')).toBe('#64748b');
    });

    it('should handle uppercase severity strings', () => {
      // The function is case-sensitive; 'CRITICAL' is not in the map
      expect(severityUtils.getSeverityColor('CRITICAL')).toBe('#64748b');
    });
  });

  describe('getSeverityBgColor(severity)', () => {
    it('should return red bg for critical', () => {
      expect(severityUtils.getSeverityBgColor('critical')).toBe('rgba(220, 38, 38, 0.15)');
    });

    it('should return orange bg for high', () => {
      expect(severityUtils.getSeverityBgColor('high')).toBe('rgba(234, 88, 12, 0.15)');
    });

    it('should return yellow bg for medium', () => {
      expect(severityUtils.getSeverityBgColor('medium')).toBe('rgba(202, 138, 4, 0.15)');
    });

    it('should return green bg for low', () => {
      expect(severityUtils.getSeverityBgColor('low')).toBe('rgba(22, 163, 74, 0.15)');
    });

    it('should return cyan bg for info', () => {
      expect(severityUtils.getSeverityBgColor('info')).toBe('rgba(8, 145, 178, 0.15)');
    });

    it('should return slate bg for unknown severity', () => {
      expect(severityUtils.getSeverityBgColor('unknown')).toBe('rgba(100, 116, 139, 0.15)');
    });
  });

  describe('ACTIVE_SEVERITY_STATUSES and CLOSED_SEVERITY_STATUSES', () => {
    it('should define active statuses', () => {
      expect(severityUtils.ACTIVE_SEVERITY_STATUSES).toEqual([
        'open', 'in_progress', 'reopened', 'under_review',
      ]);
    });

    it('should define closed statuses', () => {
      expect(severityUtils.CLOSED_SEVERITY_STATUSES).toEqual([
        'closed', 'resolved', 'verified', 'accepted_risk', 'duplicate',
      ]);
    });
  });

  describe('isActiveStatus(status)', () => {
    it('should return true for "open"', () => {
      expect(severityUtils.isActiveStatus('open')).toBe(true);
    });

    it('should return true for "in_progress"', () => {
      expect(severityUtils.isActiveStatus('in_progress')).toBe(true);
    });

    it('should return true for "reopened"', () => {
      expect(severityUtils.isActiveStatus('reopened')).toBe(true);
    });

    it('should return true for "under_review"', () => {
      expect(severityUtils.isActiveStatus('under_review')).toBe(true);
    });

    it('should return false for "closed"', () => {
      expect(severityUtils.isActiveStatus('closed')).toBe(false);
    });

    it('should return false for "resolved"', () => {
      expect(severityUtils.isActiveStatus('resolved')).toBe(false);
    });

    it('should return false for null', () => {
      expect(severityUtils.isActiveStatus(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(severityUtils.isActiveStatus(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(severityUtils.isActiveStatus('')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(severityUtils.isActiveStatus('OPEN')).toBe(true);
      expect(severityUtils.isActiveStatus('In_Progress')).toBe(true);
    });
  });

  describe('isClosedStatus(status)', () => {
    it('should return true for "closed"', () => {
      expect(severityUtils.isClosedStatus('closed')).toBe(true);
    });

    it('should return true for "resolved"', () => {
      expect(severityUtils.isClosedStatus('resolved')).toBe(true);
    });

    it('should return true for "verified"', () => {
      expect(severityUtils.isClosedStatus('verified')).toBe(true);
    });

    it('should return true for "accepted_risk"', () => {
      expect(severityUtils.isClosedStatus('accepted_risk')).toBe(true);
    });

    it('should return true for "duplicate"', () => {
      expect(severityUtils.isClosedStatus('duplicate')).toBe(true);
    });

    it('should return false for "open"', () => {
      expect(severityUtils.isClosedStatus('open')).toBe(false);
    });

    it('should return false for null', () => {
      expect(severityUtils.isClosedStatus(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(severityUtils.isClosedStatus(undefined)).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(severityUtils.isClosedStatus('CLOSED')).toBe(true);
      expect(severityUtils.isClosedStatus('Verified')).toBe(true);
    });
  });
});

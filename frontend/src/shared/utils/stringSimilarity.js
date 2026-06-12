/**
 * String Similarity Utilities - For duplicate detection
 * Lightweight implementation without external dependencies
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
const levenshteinDistance = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Deletion
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return matrix[s1.length][s2.length];
};

/**
 * Calculate similarity score between two strings (0-1)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
export const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toString().toLowerCase().trim();
  const s2 = str2.toString().toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(s1, s2);
  return 1 - (distance / maxLength);
};

/**
 * Calculate similarity between two findings
 * @param {object} finding1 - First finding
 * @param {object} finding2 - Second finding
 * @param {object} options - Weight options
 * @returns {object} Similarity result
 */
export const calculateFindingSimilarity = (finding1, finding2, options = {}) => {
  const {
    titleWeight = 0.5,
    descriptionWeight = 0.3,
    endpointWeight = 0.2,
    threshold = 0.75
  } = options;

  const titleSim = calculateSimilarity(finding1.title, finding2.title);
  const descSim = calculateSimilarity(finding1.description, finding2.description);
  const endpointSim = calculateSimilarity(
    finding1.affectedEndpoint || finding1.endpoint, 
    finding2.affectedEndpoint || finding2.endpoint
  );

  const overallScore = (titleSim * titleWeight) + 
                       (descSim * descriptionWeight) + 
                       (endpointSim * endpointWeight);

  return {
    overallScore,
    titleSimilarity: titleSim,
    descriptionSimilarity: descSim,
    endpointSimilarity: endpointSim,
    isDuplicate: overallScore >= threshold,
    confidence: overallScore >= 0.9 ? 'high' : overallScore >= 0.8 ? 'medium' : 'low'
  };
};

/**
 * Find potential duplicates in a list of findings
 * @param {array} findings - Array of findings
 * @param {object} options - Detection options
 * @returns {array} Potential duplicates with scores
 */
export const findPotentialDuplicates = (findings, options = {}) => {
  const { threshold = 0.75, maxResults = 10 } = options;
  const duplicates = [];

  for (let i = 0; i < findings.length; i++) {
    for (let j = i + 1; j < findings.length; j++) {
      const similarity = calculateFindingSimilarity(findings[i], findings[j], options);
      
      if (similarity.isDuplicate) {
        duplicates.push({
          finding1: findings[i],
          finding2: findings[j],
          ...similarity
        });
      }
    }
  }

  // Sort by overall score (highest first)
  duplicates.sort((a, b) => b.overallScore - a.overallScore);
  
  return duplicates.slice(0, maxResults);
};

/**
 * Find duplicates for a single finding against a list
 * @param {object} finding - Finding to check
 * @param {array} findings - List to check against
 * @param {object} options - Detection options
 * @returns {array} Matching findings with scores
 */
export const findDuplicatesForFinding = (finding, findings, options = {}) => {
  const { threshold = 0.75, maxResults = 5, excludeId = null } = options;
  
  const matches = findings
    .filter(f => f.id !== finding.id && f.id !== excludeId)
    .map(f => ({
      finding: f,
      ...calculateFindingSimilarity(finding, f, options)
    }))
    .filter(match => match.isDuplicate)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, maxResults);

  return matches;
};

/**
 * Quick check if two strings are similar (faster, less accurate)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {boolean}
 */
export const isSimilar = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return true;
  
  // Contains check
  if (s1.includes(s2) || s2.includes(s1)) return true;
  
  // Word overlap check
  const words1 = new Set(s1.split(/\s+/));
  const words2 = s2.split(/\s+/);
  const commonWords = words2.filter(w => words1.has(w));
  
  return commonWords.length >= Math.min(words1.size, words2.length) * 0.7;
};

export default {
  calculateSimilarity,
  calculateFindingSimilarity,
  findPotentialDuplicates,
  findDuplicatesForFinding,
  isSimilar
};

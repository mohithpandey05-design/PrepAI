function isValidCandidateName(name) {
  if (!name || typeof name !== 'string') return false;

  const trimmed = name.trim();

  if (trimmed.length < 2 || trimmed.length > 60) return false;

  if (!/[a-zA-Z]{2,}/.test(trimmed)) return false;

  if (/[%\/\\\[\]\(\)\{\}<>=+\*^\$#@!\?;:_~\|]/.test(trimmed)) return false;

  if (/\d/.test(trimmed)) return false;

  const lower = trimmed.toLowerCase();

  const suspiciousWebTerms = [
    'http', 'https', 'www', 'linkedin', 'github', 'git', 'bit.ly',
    '.com', '.org', '.net', '.edu', '.in', '.io', '.pdf', '.doc',
    '.docx', '.txt', '.rtf', '.png', '.jpg', '.jpeg'
  ];
  for (const term of suspiciousWebTerms) {
    if (lower.includes(term)) return false;
  }

  const pdfArtifacts = [
    '%pdf', 'pdf-', 'pdf', 'obj', 'endobj', 'stream', 'xref',
    'trailer', 'startxref', 'catalog', 'pages', 'root'
  ];
  for (const artifact of pdfArtifacts) {
    if (lower.includes(artifact)) return false;
  }

  const invalidKeywords = [
    'resume', 'curriculum vitae', 'curriculum', 'vitae', 'cv', 'profile',
    'personal information', 'personal info', 'contact', 'education', 'skills',
    'experience', 'projects', 'work history', 'summary', 'objective',
    'declaration', 'certifications', 'hobbies', 'languages', 'engineer',
    'developer', 'candidate', 'full stack', 'backend', 'frontend', 'b.tech',
    'computer science', 'university', 'college', 'school', 'overview',
    'internship', 'management', 'science', 'engineering', 'page', 'address',
    'details', 'synopsis', 'academic', 'qualification', 'qualifications',
    'background', 'achievements', 'references', 'information', 'personal',
    'honors', 'awards', 'publication', 'publications', 'technical skills',
    'work experience'
  ];

  for (const kw of invalidKeywords) {
    if (lower.includes(kw)) return false;
  }

  if (!/^[a-zA-Z\s\.\'-]+$/.test(trimmed)) return false;

  // Check word count: 1 to 5 words
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 5) return false;

  return true;
}

/**
 * Strategy to extract a candidate name from raw resume text
 */
function extractCandidateNameFromText(resumeText) {
  if (!resumeText || typeof resumeText !== 'string') return '';

  const lines = resumeText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Check the first 15 lines of the resume (where candidate names usually reside)
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];

    // Skip lines with emails, phone numbers, or URLs
    if (line.includes('@') || line.match(/https?:\/\//i) || line.match(/\+?\d[\d\s-]{8,}/)) {
      continue;
    }

    if (isValidCandidateName(line)) {
      return line;
    }
  }

  return '';
}

module.exports = {
  isValidCandidateName,
  extractCandidateNameFromText
};

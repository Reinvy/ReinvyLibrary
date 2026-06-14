const fs = require('fs');
const path = require('path');

const ALLOWED_CATEGORIES = ['backend', 'frontend', 'mobile', 'devops', 'database', 'testing'];
const ALLOWED_TECHNOLOGIES = [
  'express-js', 'flutter', 'docker', 'redis', 'mongodb', 'mongoose', 
  'postgres', 'prisma', 'typescript', 'jest', 'pm2', 'zod', 
  'passport-js', 'bullmq', 'nodemailer', 'socket-io', 'jwt', 'express-generator'
];
const ALLOWED_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const ALLOWED_TYPES = ['tutorial', 'syllabus', 'cheatsheet', 'guide'];

const ROOT_DIR = path.join(__dirname, '..');
let errorCount = 0;

function logError(filePath, message) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  console.error(`[VALIDATION ERROR] ${relativePath}: ${message}`);
  errorCount++;
}

function getPluralType(type) {
  if (type === 'syllabus') return 'syllabi';
  return `${type}s`;
}

function validateFile(filePath) {
  const filename = path.basename(filePath);
  const relativeDir = path.relative(ROOT_DIR, path.dirname(filePath)).replace(/\\/g, '/');
  
  // 1. Filename kebab-case validation
  // Strip .md and _id.md
  let baseName = filename;
  let isId = false;
  if (baseName.endsWith('_id.md')) {
    baseName = baseName.slice(0, -6);
    isId = true;
  } else if (baseName.endsWith('.md')) {
    baseName = baseName.slice(0, -3);
  } else {
    logError(filePath, 'File must have .md extension.');
    return;
  }
  
  const kebabRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!kebabRegex.test(baseName)) {
    logError(filePath, `Filename "${filename}" must be kebab-case (lowercase, numbers, and hyphens only).`);
  }
  
  // 2. Frontmatter validation
  const content = fs.readFileSync(filePath, 'utf8');
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    logError(filePath, 'File is missing YAML frontmatter block at the top.');
    return;
  }
  
  const yamlLines = match[1].split(/\r?\n/);
  const metadata = {};
  
  for (const line of yamlLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.substring(0, colonIndex).trim();
    let val = line.substring(colonIndex + 1).trim();
    // Strip quotes if present
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.substring(1, val.length - 1);
    }
    metadata[key] = val;
  }
  
  const requiredFields = ['title', 'description', 'category', 'technology', 'difficulty', 'type', 'locale'];
  for (const field of requiredFields) {
    if (!metadata[field]) {
      logError(filePath, `Missing mandatory frontmatter field: "${field}"`);
    }
  }
  
  // If some required fields are missing, stop deeper validation on them
  if (errorCount > 0) return;
  
  // Locale check
  if (metadata.locale !== 'en' && metadata.locale !== 'id') {
    logError(filePath, `Invalid locale "${metadata.locale}". Must be "en" or "id".`);
  } else {
    if (isId && metadata.locale !== 'id') {
      logError(filePath, `Locale is set to "${metadata.locale}" but file ends with "_id.md".`);
    }
    if (!isId && metadata.locale !== 'en') {
      logError(filePath, `Locale is set to "${metadata.locale}" but file does not end with "_id.md".`);
    }
  }
  
  // Category check
  if (!ALLOWED_CATEGORIES.includes(metadata.category)) {
    logError(filePath, `Invalid category "${metadata.category}". Allowed: ${ALLOWED_CATEGORIES.join(', ')}`);
  }
  
  // Technology check
  if (!ALLOWED_TECHNOLOGIES.includes(metadata.technology)) {
    logError(filePath, `Invalid technology "${metadata.technology}". Allowed: ${ALLOWED_TECHNOLOGIES.join(', ')}`);
  }
  
  // Difficulty check
  if (!ALLOWED_DIFFICULTIES.includes(metadata.difficulty)) {
    logError(filePath, `Invalid difficulty "${metadata.difficulty}". Allowed: ${ALLOWED_DIFFICULTIES.join(', ')}`);
  }
  
  // Type check
  if (!ALLOWED_TYPES.includes(metadata.type)) {
    logError(filePath, `Invalid type "${metadata.type}". Allowed: ${ALLOWED_TYPES.join(', ')}`);
  }
  
  // 3. Path structure validation
  // Folder layout must match: <category>/<technology>/<pluralType>
  const expectedPath = `${metadata.category}/${metadata.technology}/${getPluralType(metadata.type)}`;
  if (relativeDir !== expectedPath) {
    logError(filePath, `File path does not match metadata. Expected folder: "${expectedPath}", Actual: "${relativeDir}"`);
  }
}

function walkDir(dir) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      // Exclude system folders
      if (file !== '.git' && file !== '.github' && file !== 'node_modules' && file !== 'scripts') {
        walkDir(fullPath);
      }
    } else if (file.endsWith('.md') && dir !== ROOT_DIR) {
      validateFile(fullPath);
    }
  }
}

console.log('Starting content validation...');
walkDir(ROOT_DIR);

if (errorCount > 0) {
  console.error(`\nValidation FAILED with ${errorCount} errors.`);
  process.exit(1);
} else {
  console.log('\nValidation PASSED successfully!');
  process.exit(0);
}

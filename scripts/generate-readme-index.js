const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const ALLOWED_CATEGORIES = ['backend', 'frontend', 'mobile', 'devops', 'database'];
const ALLOWED_TECHNOLOGIES = [
  'expressjs', 'elysiajs', 'nextjs', 'react-native', 'flutter', 'golang', 'laravel',
  'docker', 'pm2', 'redis', 'mongodb', 'postgres'
];

function getPluralType(type) {
  if (type === 'syllabus') return 'syllabi';
  return `${type}s`;
}

// Find all content files recursively
function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== '.git' && file !== '.github' && file !== 'node_modules' && file !== 'scripts') {
        findMarkdownFiles(fullPath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// Parse YAML frontmatter
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
  const match = content.match(frontmatterRegex);
  if (!match) return null;
  
  const yamlLines = match[1].split(/\r?\n/);
  const metadata = {};
  for (const line of yamlLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.substring(0, colonIndex).trim();
    let val = line.substring(colonIndex + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.substring(1, val.length - 1);
    metadata[key] = val;
  }
  return metadata;
}

function capitalize(str) {
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function generateIndexMarkdown(locale) {
  const files = findMarkdownFiles(ROOT_DIR);
  const data = {};
  
  // Group files by category -> technology -> base filename
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const metadata = parseFrontmatter(content);
    if (!metadata) continue;
    
    const category = metadata.category;
    const tech = metadata.technology;
    const type = metadata.type;
    const diff = metadata.difficulty;
    
    const relativePath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
    
    // Determine base filename (strip _id.md or .md)
    const filename = path.basename(file);
    let baseName = filename;
    if (baseName.endsWith('_id.md')) {
      baseName = baseName.slice(0, -6);
    } else {
      baseName = baseName.slice(0, -3);
    }
    
    if (!data[category]) data[category] = {};
    if (!data[category][tech]) data[category][tech] = {};
    if (!data[category][tech][baseName]) {
      data[category][tech][baseName] = {
        title: metadata.title,
        type: type,
        difficulty: diff,
        enPath: '',
        idPath: '',
        enTitle: '',
        idTitle: ''
      };
    }
    
    if (metadata.locale === 'id') {
      data[category][tech][baseName].idPath = relativePath;
      data[category][tech][baseName].idTitle = metadata.title;
    } else {
      data[category][tech][baseName].enPath = relativePath;
      data[category][tech][baseName].enTitle = metadata.title;
    }
  }
  
  // Build Markdown index
  let markdown = '';
  
  const headers = locale === 'id' ? {
    topic: 'Topik',
    type: 'Format',
    difficulty: 'Kesulitan',
    languages: 'Bahasa Tersedia',
    category: 'Kategori',
    technology: 'Teknologi'
  } : {
    topic: 'Topic',
    type: 'Format',
    difficulty: 'Difficulty',
    languages: 'Available Languages',
    category: 'Category',
    technology: 'Technology'
  };
  
  for (const cat of ALLOWED_CATEGORIES) {
    if (!data[cat]) continue;
    
    markdown += `\n### 📁 ${capitalize(cat)}\n`;
    
    for (const tech of ALLOWED_TECHNOLOGIES) {
      if (!data[cat][tech]) continue;
      
      markdown += `\n#### 🏷️ ${capitalize(tech)}\n\n`;
      markdown += `| ${headers.topic} | ${headers.type} | ${headers.difficulty} | ${headers.languages} |\n`;
      markdown += `| :--- | :--- | :--- | :--- |\n`;
      
      const topics = Object.keys(data[cat][tech]).sort();
      for (const topicKey of topics) {
        const topic = data[cat][tech][topicKey];
        
        // Language links
        const langLinks = [];
        let mainLink = '';
        
        if (topic.enPath) {
          langLinks.push(`[EN](${topic.enPath})`);
          if (!mainLink) mainLink = topic.enPath;
        }
        if (topic.idPath) {
          langLinks.push(`[ID](${topic.idPath})`);
          if (!mainLink) mainLink = topic.idPath;
        }
        
        // Choose title based on locale
        let displayTitle = topic.title;
        if (locale === 'id' && topic.idTitle) {
          displayTitle = topic.idTitle;
        } else if (locale === 'en' && topic.enTitle) {
          displayTitle = topic.enTitle;
        }
        
        const displayType = capitalize(topic.type);
        const displayDifficulty = capitalize(topic.difficulty);
        
        markdown += `| [${displayTitle}](${mainLink}) | ${displayType} | ${displayDifficulty} | ${langLinks.join(' \\| ')} |\n`;
      }
    }
  }
  
  return markdown;
}

function updateReadme(filePath, locale) {
  if (!fs.existsSync(filePath)) {
    console.log(`Readme file not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const indexMarkdown = generateIndexMarkdown(locale);
  
  const startTag = '<!-- INDEX_START -->';
  const endTag = '<!-- INDEX_END -->';
  
  const startIndex = content.indexOf(startTag);
  const endIndex = content.indexOf(endTag);
  
  if (startIndex === -1 || endIndex === -1) {
    console.log(`Index placeholders not found in: ${filePath}`);
    return;
  }
  
  const newContent = content.substring(0, startIndex + startTag.length) + 
                     '\n' + indexMarkdown.trim() + '\n' + 
                     content.substring(endIndex);
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Updated Index in: ${path.basename(filePath)}`);
}

// Update both English and Indonesian READMEs
updateReadme(path.join(ROOT_DIR, 'README.md'), 'en');
updateReadme(path.join(ROOT_DIR, 'README_ID.md'), 'id');

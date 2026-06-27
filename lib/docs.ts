import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const docsDirectory = path.join(process.cwd(), 'docs');

// Verify that the path is inside the docs directory to prevent directory traversal
function securePath(filePath: string): boolean {
  const relative = path.relative(docsDirectory, filePath);
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export interface DocMetadata {
  slug: string;
  title: string;
  description?: string;
  category: string;
  order: number;
}

export interface DocData extends DocMetadata {
  content: string;
}

export interface DocNode {
  name: string;
  slug?: string;
  isDir: boolean;
  children?: DocNode[];
  category?: string;
}

// Ensure the docs directory exists
function ensureDocsDir() {
  if (!fs.existsSync(docsDirectory)) {
    fs.mkdirSync(docsDirectory, { recursive: true });
  }
}

// Walk directory recursively
function walkDirectory(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDirectory(fullPath));
    } else if (file.endsWith('.md')) {
      results.push(fullPath);
    }
  });
  return results;
}

export function getAllDocsList(): DocMetadata[] {
  ensureDocsDir();
  const filePaths = walkDirectory(docsDirectory);
  
  const docs = filePaths.map((filePath) => {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContents);
    
    // Relative path from docs folder
    const relativePath = path.relative(docsDirectory, filePath);
    // Replace backslashes on Windows with forward slashes for clean slugs
    const slug = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');

    // Categorize based on frontmatter, or fallback to folder name, or fallback to 'General'
    const category = data.category || path.dirname(relativePath) !== '.' 
      ? path.dirname(relativePath).replace(/\\/g, '/')
      : 'General';

    return {
      slug,
      title: data.title || path.basename(filePath, '.md'),
      description: data.description || '',
      category: category === '.' ? 'General' : category,
      order: data.order !== undefined ? Number(data.order) : 99,
    };
  });

  // Sort docs by order, then by title
  return docs.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });
}

export function getDocData(slugParts: string[]): DocData | null {
  ensureDocsDir();
  const decodedParts = slugParts.map(decodeURIComponent);
  const relativePath = decodedParts.join(path.sep) + '.md';
  const fullPath = path.join(docsDirectory, relativePath);

  if (!securePath(fullPath)) {
    throw new Error('Access denied: Invalid file path');
  }

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  const category = data.category || (decodedParts.length > 1 ? decodedParts.slice(0, -1).join('/') : 'General');

  return {
    slug: decodedParts.join('/'),
    title: data.title || decodedParts[decodedParts.length - 1],
    description: data.description || '',
    category,
    order: data.order !== undefined ? Number(data.order) : 99,
    content,
  };
}

export function saveDocData(slugParts: string[], doc: Partial<DocData> & { content: string }): void {
  ensureDocsDir();
  const decodedParts = slugParts.map(decodeURIComponent);
  const relativePath = decodedParts.join(path.sep) + '.md';
  const fullPath = path.join(docsDirectory, relativePath);

  if (!securePath(fullPath)) {
    throw new Error('Access denied: Invalid file path');
  }

  // Ensure parent directory exists
  const parentDir = path.dirname(fullPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  const frontmatter = {
    title: doc.title || decodedParts[decodedParts.length - 1],
    description: doc.description || '',
    category: doc.category || (decodedParts.length > 1 ? decodedParts.slice(0, -1).join('/') : 'General'),
    order: doc.order !== undefined ? Number(doc.order) : 99,
  };

  const fileContent = matter.stringify(doc.content, frontmatter);
  fs.writeFileSync(fullPath, fileContent, 'utf8');
}

export function createNewDoc(title: string, category: string, description: string = ''): string {
  ensureDocsDir();
  
  // Create clean slug
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const cleanCategory = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  const slugParts = cleanCategory ? [cleanCategory, cleanTitle] : [cleanTitle];
  const relativePath = slugParts.join(path.sep) + '.md';
  const fullPath = path.join(docsDirectory, relativePath);

  if (!securePath(fullPath)) {
    throw new Error('Access denied: Invalid file path');
  }

  if (fs.existsSync(fullPath)) {
    // If it exists, append a timestamp to avoid overwrite conflicts
    const newTitle = `${title} (New)`;
    const newSlugParts = cleanCategory 
      ? [cleanCategory, `${cleanTitle}-${Date.now().toString().slice(-4)}`] 
      : [`${cleanTitle}-${Date.now().toString().slice(-4)}`];
    saveDocData(newSlugParts, {
      title: newTitle,
      category: category || 'General',
      description,
      order: 10,
      content: `# ${newTitle}\n\nStart writing your document here...`,
    });
    return newSlugParts.join('/');
  }

  saveDocData(slugParts, {
    title,
    category: category || 'General',
    description,
    order: 10,
    content: `# ${title}\n\nStart writing your document here...`,
  });

  return slugParts.join('/');
}

export function deleteDocFile(slugParts: string[]): boolean {
  ensureDocsDir();
  const decodedParts = slugParts.map(decodeURIComponent);
  const relativePath = decodedParts.join(path.sep) + '.md';
  const fullPath = path.join(docsDirectory, relativePath);

  if (!securePath(fullPath)) {
    throw new Error('Access denied: Invalid file path');
  }

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    
    // Clean up empty parent directories if any
    let currentDir = path.dirname(fullPath);
    while (currentDir !== docsDirectory) {
      if (fs.readdirSync(currentDir).length === 0) {
        fs.rmdirSync(currentDir);
        currentDir = path.dirname(currentDir);
      } else {
        break;
      }
    }
    return true;
  }
  return false;
}

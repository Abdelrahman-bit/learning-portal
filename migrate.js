const fs = require('fs');
const path = require('path');

const srcDir = 'D:\\commander files\\work\\Appout\\docs';
const destDocsDir = 'd:\\commander files\\work\\Appout\\learning-portal\\docs';
const destAssetsDir = 'd:\\commander files\\work\\Appout\\learning-portal\\public\\assets';

// Create directories if they don't exist
if (!fs.existsSync(destDocsDir)) fs.mkdirSync(destDocsDir, { recursive: true });
if (!fs.existsSync(destAssetsDir)) fs.mkdirSync(destAssetsDir, { recursive: true });

const dirs = fs.readdirSync(srcDir, { withFileTypes: true }).filter(dirent => dirent.isDirectory());

dirs.forEach(dir => {
    const dirPath = path.join(srcDir, dir.name);
    const files = fs.readdirSync(dirPath);
    
    let mdFile = null;
    let mediaFiles = [];

    files.forEach(file => {
        if (file.toLowerCase().endsWith('.md')) {
            mdFile = file;
        } else {
            mediaFiles.push(file);
        }
    });

    if (mdFile) {
        // use folder name as new md file name, spaces to dashes
        const safeDirName = dir.name.replace(/\s+/g, '-');
        const newMdName = safeDirName + '.md';
        const srcMdPath = path.join(dirPath, mdFile);
        const destMdPath = path.join(destDocsDir, newMdName);

        let content = fs.readFileSync(srcMdPath, 'utf8');
        let mediaAppends = [];

        mediaFiles.forEach(media => {
            const srcMedia = path.join(dirPath, media);
            
            // Clean media name
            const safeMediaName = media.replace(/\s+/g, '_').replace(/&/g, 'and');
            const newMediaName = `${safeDirName}_${safeMediaName}`;
            const destMedia = path.join(destAssetsDir, newMediaName);
            
            fs.copyFileSync(srcMedia, destMedia);

            // Create markdown to append
            if (media.toLowerCase().endsWith('.mp4') || media.toLowerCase().endsWith('.webm')) {
                mediaAppends.push(`\n<video controls width="100%" style="border-radius: 8px; margin-top: 1rem;">\n  <source src="/assets/${newMediaName}" type="video/mp4" />\n  Your browser does not support the video tag.\n</video>\n`);
            } else if (media.toLowerCase().endsWith('.png') || media.toLowerCase().endsWith('.jpg') || media.toLowerCase().endsWith('.jpeg') || media.toLowerCase().endsWith('.gif')) {
                mediaAppends.push(`\n![${media}](/assets/${newMediaName})\n`);
            }
        });

        if (mediaAppends.length > 0) {
            content += '\n\n---\n\n### Attached Media\n\n' + mediaAppends.join('\n');
        }

        fs.writeFileSync(destMdPath, content);
        console.log(`Migrated ${dir.name} -> ${newMdName} (with ${mediaFiles.length} media files)`);
    }
});

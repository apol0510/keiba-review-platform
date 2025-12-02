const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const INPUT_DIR = path.join(__dirname, '..', 'public', 'screenshots');
const OUTPUT_DIR = INPUT_DIR;

async function optimizeImage(filename) {
  const inputPath = path.join(INPUT_DIR, filename);
  const outputPath = path.join(OUTPUT_DIR, filename);
  
  try {
    await sharp(inputPath)
      .resize(600, 400, { fit: 'cover', position: 'top' })
      .webp({ quality: 85 })
      .toFile(outputPath.replace('.png', '.webp'));
    
    console.log(`✅ ${filename}`);
  } catch (error) {
    console.error(`❌ ${filename}: ${error.message}`);
  }
}

async function main() {
  console.log('🎨 画像最適化開始\n');
  
  const files = await fs.readdir(INPUT_DIR);
  const pngFiles = files.filter(f => f.endsWith('.png'));
  
  console.log(`📸 対象: ${pngFiles.length}枚\n`);
  
  for (let i = 0; i < pngFiles.length; i += 5) {
    const batch = pngFiles.slice(i, i + 5);
    await Promise.all(batch.map(f => optimizeImage(f)));
    console.log(`進捗: ${Math.min(i + 5, pngFiles.length)}/${pngFiles.length}`);
  }
  
  console.log('\n🎉 完了！');
}

main().catch(console.error);

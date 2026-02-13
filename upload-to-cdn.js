import "dotenv/config";
import { UTApi } from "uploadthing/server";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADTHING_SECRET = process.env.UPLOADTHING_SECRET;

if (!UPLOADTHING_SECRET) {
  console.error("Error: UPLOADTHING_SECRET environment variable is required");
  console.error("Usage: UPLOADTHING_SECRET=your_api_key node upload-to-cdn.js");
  process.exit(1);
}

const utapi = new UTApi({ apiKey: UPLOADTHING_SECRET });

const ASSETS_DIR = path.join(__dirname, "src", "assets");

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp", ".PNG", ".JPG", ".JPEG", ".SVG"];

async function getAllImages(dir, baseDir = dir) {
  const images = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      const subImages = await getAllImages(fullPath, baseDir);
      images.push(...subImages);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (IMAGE_EXTENSIONS.includes(ext)) {
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
        images.push({
          fullPath,
          relativePath,
          fileName: entry.name,
        });
      }
    }
  }

  return images;
}

async function uploadImages() {
  console.log("Scanning for images in:", ASSETS_DIR);
  
  const images = await getAllImages(ASSETS_DIR);
  console.log(`Found ${images.length} images to upload\n`);

  if (images.length === 0) {
    console.log("No images found. Exiting.");
    return;
  }

  const urlMapping = {};
  let successCount = 0;
  let failCount = 0;

  for (const image of images) {
    console.log(`Uploading: ${image.relativePath}`);
    
    try {
      const fileBuffer = fs.readFileSync(image.fullPath);
      const ext = path.extname(image.fileName).toLowerCase();
      
      const mimeTypes = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".gif": "image/gif",
        ".webp": "image/webp",
      };

      const mimeType = mimeTypes[ext] || "application/octet-stream";
      
      const file = new File([fileBuffer], image.fileName, { type: mimeType });
      
      const customId = image.relativePath.replace(/\//g, "--").replace(/ /g, "_");
      
      const response = await utapi.uploadFiles([file], {
        acl: "public-read",
        customId,
      });

      if (response[0].error) {
        console.error(`  ❌ Failed: ${response[0].error.message}`);
        failCount++;
        urlMapping[image.relativePath] = { error: response[0].error.message };
      } else {
        const data = response[0].data;
        console.log(`  ✅ Success: ${data.url}`);
        successCount++;
        urlMapping[image.relativePath] = {
          url: data.url,
          key: data.key,
          customId: data.customId,
        };
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      failCount++;
      urlMapping[image.relativePath] = { error: error.message };
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const outputPath = path.join(__dirname, "cdn-urls.json");
  fs.writeFileSync(outputPath, JSON.stringify(urlMapping, null, 2));
  console.log(`\n📁 URL mapping saved to: cdn-urls.json`);

  const jsOutput = generateJsConstants(urlMapping);
  const jsPath = path.join(__dirname, "cdn-urls.js");
  fs.writeFileSync(jsPath, jsOutput);
  console.log(`📁 JavaScript constants saved to: cdn-urls.js`);

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total: ${images.length}`);

  if (successCount === images.length) {
    console.log(`\n🎉 All images uploaded successfully!`);
    console.log(`\nNext steps:`);
    console.log(`1. Share cdn-urls.json with me to update your HTML files`);
    console.log(`2. Or use cdn-urls.js in your project`);
  }
}

function generateJsConstants(urlMapping) {
  const entries = Object.entries(urlMapping)
    .filter(([_, value]) => value.url)
    .map(([path, value]) => {
      const key = path
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .toUpperCase();
      return `  ${key}: "${value.url}",`;
    });

  return `// Auto-generated CDN URLs for Radiant Apparels
// Generated on: ${new Date().toISOString()}

export const CDN_URLS = {
${entries.join("\n")}
};

export default CDN_URLS;
`;
}

uploadImages().catch(console.error);

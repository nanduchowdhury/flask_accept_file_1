const fs = require('fs');
const path = require('path');
const terser = require('terser');

// Define the source and output directories
const srcDir = path.join(__dirname, 'static');
const outDir = path.join(srcDir, 'min');

// Ensure the output directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Function to minify JavaScript files
function minifyFile(filePath, outputPath) {
  const code = fs.readFileSync(filePath, 'utf8');

  terser.minify(code).then(minified => {
    if (minified.error) {
      console.error(`Error minifying ${filePath}:`, minified.error);
    } else {
      fs.writeFileSync(outputPath, minified.code, 'utf8');
      console.log(`Minified ${filePath} -> ${outputPath}`);
    }
  });
}

// Read through each file in the source directory
fs.readdirSync(srcDir).forEach(file => {
  const filePath = path.join(srcDir, file);

  // Only process JavaScript files
  if (path.extname(file) === '.js') {
    const outputPath = path.join(outDir, file); // Output to 'min' subdirectory
    minifyFile(filePath, outputPath);
  }
});

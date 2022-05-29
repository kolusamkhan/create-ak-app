import copyAssets from '../dist-esm/helpers/copy-assets.js';
let source  = "templates";
let destination = "dist-esm";
let context = process.cwd();
console.log('Copying static assets.....')
copyAssets(source, destination, context);
console.log('Copied static assets.....')
copyAssets('package.json', destination, context);
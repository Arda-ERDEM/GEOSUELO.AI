const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, '../artifacts/antigravity/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Extract the clash logic block
const blockRegex = /const \[clashWarning[\s\S]*?\}, \[zonePoints, visibleAssets\]\);\s*/;
const match = content.match(blockRegex);

if (match) {
    const clashBlock = match[0];
    
    // 2. Remove it from its current position
    content = content.replace(blockRegex, '');
    
    // 3. Find where visibleAssets is defined and its closing brace
    // const visibleAssets = useMemo(() => { ... }, [assets, predictedAsset]);
    const visibleAssetsRegex = /const visibleAssets = useMemo\(\(\) => \{[\s\S]*?\}, \[assets, predictedAsset\]\);\s*/;
    const vaMatch = content.match(visibleAssetsRegex);
    
    if (vaMatch) {
        // Insert right after visibleAssets
        content = content.replace(visibleAssetsRegex, vaMatch[0] + '\n' + clashBlock + '\n');
        fs.writeFileSync(appTsxPath, content);
        console.log("Moved clash logic below visibleAssets declaration.");
    } else {
        console.log("Could not find visibleAssets useMemo block.");
    }
} else {
    console.log("Could not find clash logic block.");
}

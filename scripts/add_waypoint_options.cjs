const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, '../artifacts/antigravity/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Add new states
const stateInjection = `
  const [waypointUtility, setWaypointUtility] = useState<UtilityType>('water');
  const [deletedAssetIds, setDeletedAssetIds] = useState<string[]>([]);
`;
if (!content.includes('waypointUtility')) {
    const hooksPattern = "const [activePanels, setActivePanels]";
    const hooksIndex = content.indexOf(hooksPattern);
    content = content.substring(0, hooksIndex) + stateInjection + content.substring(hooksIndex);
}

// 2. Update onMapCoordinateClick
content = content.replace(
  /utilityType:\s*'water'/g,
  'utilityType: waypointUtility'
);

// 3. Update visibleAssets to filter out deleted ones
const visibleAssetsPattern = "return predictedAsset && !assets.some((asset) => asset.id === predictedAsset.id)";
const newVisibleAssetsPattern = "const merged = predictedAsset && !assets.some((asset) => asset.id === predictedAsset.id) ? [...assets, predictedAsset] : assets; return merged.filter(a => !deletedAssetIds.includes(a.id));";

if (content.includes(visibleAssetsPattern)) {
    content = content.replace(visibleAssetsPattern + "\n      ? [...assets, predictedAsset] : assets;", newVisibleAssetsPattern);
}

// 4. Update UI in "Waypoint Ekle & Tahmin Et"
const uiPattern = `<div className="cad-panel-title"><Route size={12} /> Waypoint Ekle & Tahmin Et</div>
            <div style={{ padding: '8px' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>`;

const newUiPattern = `<div className="cad-panel-title"><Route size={12} /> Waypoint Ekle & Tahmin Et</div>
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '10px' }}>
                 <label style={{ fontSize: '10px', color: '#ccc', marginRight: '8px' }}>Hattın Türü:</label>
                 <select value={waypointUtility} onChange={(e) => setWaypointUtility(e.target.value as UtilityType)} style={{ background: '#111', color: '#fff', border: '1px solid #444', padding: '4px', fontSize: '11px', borderRadius: '4px', width: '100px' }}>
                    <option value="water">💧 Su</option>
                    <option value="gas">🔥 Doğalgaz</option>
                    <option value="electric">⚡ Elektrik</option>
                    <option value="fiber">🌐 Fiber</option>
                 </select>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>`;

if (content.includes(uiPattern) && !content.includes('Hattın Türü:')) {
    content = content.replace(uiPattern, newUiPattern);
}

// Add the Clear Predictions button below the "Yeraltı Hattını Tahmin Et" button
const predictBtnPattern = `? Yeraltı Hattını Tahmin Et
              </button>
            </div>
          </div>`;

const newPredictBtnPattern = `? Yeraltı Hattını Tahmin Et
              </button>
              <button className="btn" style={{ width: '100%', height: '24px', fontSize: '10px', marginTop: '6px', color: '#ff3333', borderColor: '#ff3333' }} onClick={() => {
                 const aiIds = visibleAssets.filter(a => a.dataSource === 'ai_prediction').map(a => a.id);
                 if (aiIds.length) setDeletedAssetIds(prev => [...prev, ...aiIds]);
              }}>
                <Trash2 size={10} style={{marginRight: 4}}/> Yapay Zeka Çizimlerini Sil
              </button>
            </div>
          </div>`;

// Note: since there are some encoding issues with 'Yeraltı Hattını Tahmin Et' (could be Yeralt Hattn), let's use a safer regex:
const safeBtnRegex = /(<button className="btn btn-primary"[\s\S]*?Tahmin Et\s*<\/button>)\s*(<\/div>\s*<\/div>)/;
const replacement = `$1\n              <button className="btn" style={{ width: '100%', height: '24px', fontSize: '10px', marginTop: '6px', color: '#ff3333', borderColor: '#ff3333' }} onClick={() => { const aiIds = visibleAssets.filter(a => a.dataSource === 'ai_prediction').map(a => a.id); if (aiIds.length) setDeletedAssetIds(prev => [...prev, ...aiIds]); }}>\n                <Trash2 size={10} style={{marginRight: 4}}/> Eklenen (AI) Çizimleri Sil\n              </button>\n$2`;

content = content.replace(safeBtnRegex, replacement);

fs.writeFileSync(appTsxPath, content);
console.log("Waypoint options added successfully.");

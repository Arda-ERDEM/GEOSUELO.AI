const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, '../artifacts/antigravity/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Add clash detection function and state
const funcInjection = `
  const [clashWarning, setClashWarning] = useState<string | null>(null);

  // Ray-casting algorithm for point in polygon
  const isPointInPolygon = (point: Coordinate, vs: Coordinate[]) => {
    let x = point.lon, y = point.lat;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].lon, yi = vs[i].lat;
        let xj = vs[j].lon, yj = vs[j].lat;
        let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
  };

  const checkClash = () => {
    if (zonePoints.length < 3) return;
    for (const asset of visibleAssets) {
      // Check start point, end point, and midpoint
      const mid = { lat: (asset.start.lat + asset.end.lat)/2, lon: (asset.start.lon + asset.end.lon)/2 };
      if (isPointInPolygon(asset.start, zonePoints) || isPointInPolygon(asset.end, zonePoints) || isPointInPolygon(mid, zonePoints)) {
        let name = asset.utilityType === 'water' ? 'Su Borusu' : asset.utilityType === 'gas' ? 'Doğalgaz Borusu' : asset.utilityType === 'fiber' ? 'Fiber Kablo' : 'Altyapı Hattı';
        setClashWarning(\`DİKKAT! Çizdiğiniz kazı alanı içerisinde \${name} tespit edildi! Olası Çarpışma Riski!\`);
        setActiveBottomTab('clash'); // Also switch tab
        return;
      }
    }
    setClashWarning("Kazı alanı temiz. Tespit edilen hat yok.");
  };

  useEffect(() => {
    if (zonePoints.length >= 3) {
      checkClash();
    } else {
      setClashWarning(null);
    }
  }, [zonePoints, visibleAssets]);

`;

if (!content.includes('isPointInPolygon')) {
    const hookMarker = "useEffect(() => {\n    if (activePointerTool === 'select' && zonePoints.length > 0)";
    if (content.includes(hookMarker)) {
        content = content.replace(hookMarker, funcInjection + hookMarker);
    } else {
        const fallbackMarker = "const invalidate = (includeAssets = false) => {";
        content = content.replace(fallbackMarker, funcInjection + fallbackMarker);
    }
}

// 2. Add Clash UI to CAD canvas
const clashUI = `
      {clashWarning && (
        <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', background: clashWarning.includes('DİKKAT') ? '#ff3333' : '#28a745', color: '#fff', padding: '12px 24px', borderRadius: '4px', zIndex: 4000, boxShadow: '0 5px 15px rgba(0,0,0,0.5)', fontWeight: 'bold', border: '2px solid #fff' }}>
          {clashWarning.includes('DİKKAT') ? <AlertOctagon size={18} style={{verticalAlign:'middle', marginRight: 8}}/> : <ShieldCheck size={18} style={{verticalAlign:'middle', marginRight: 8}}/>}
          {clashWarning}
          <button style={{ marginLeft: '16px', background: 'transparent', border: '1px solid #fff', color: '#fff', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setZonePoints([])}>Alanı Sil</button>
        </div>
      )}
`;
if (!content.includes('clashWarning && (')) {
    content = content.replace('{/* ANALYSIS DIALOGS', clashUI + '\n      {/* ANALYSIS DIALOGS');
}

// 3. Update Toolbar
// Change Triangle to Pen/Draw icon
content = content.replace(/<Triangle size=\{14\} \/>/g, '<Scan size={14} />');
content = content.replace(/title="Draw Excavation Zone"/g, 'title="Kazı Alanı Çiz (Serbest Çokgen)"');

// Add Trash icon next to Draw icon
const drawBtnRegex = /(<button title="Kazı Alanı Çiz.*?<\/button>)/;
content = content.replace(drawBtnRegex, `$1\n        <button title="Kazı Alanını Temizle" onClick={() => setZonePoints([])}><Trash2 size={14} color="#ff3333" /></button>`);

// Fix Trash2 import if needed
if (!content.includes('Trash2')) {
  content = content.replace("Triangle,", "Triangle, Trash2,");
}


fs.writeFileSync(appTsxPath, content);
console.log("Added clash detection and draw tools.");

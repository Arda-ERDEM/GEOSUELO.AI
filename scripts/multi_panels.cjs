const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, '../artifacts/antigravity/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Change State
content = content.replace(
  /const \[activePanel, setActivePanel\].*?;/,
  `const [activePanels, setActivePanels] = useState<string[]>([]);
  const togglePanel = (id: string) => setActivePanels(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);`
);

// 2. Replace activePanel usage in toolbar
content = content.replace(/activePanel === '([a-zA-Z0-9_]+)'/g, "activePanels.includes('$1')");
content = content.replace(/setActivePanel\(\s*p\s*=>\s*p\s*===\s*'([a-zA-Z0-9_]+)'\s*\?\s*'none'\s*:\s*'[a-zA-Z0-9_]+'\s*\)/g, "togglePanel('$1')");
// Just in case there are direct calls like setActivePanel('ar_camera')
content = content.replace(/setActivePanel\('([a-zA-Z0-9_]+)'\)/g, "togglePanel('$1')");
// If there is setActivePanel('none'), remove it or make it clear all (though in this case X button will use togglePanel)

// 3. Replace the Floating Panels structure
const panelsStartPattern = "{/* ANALYSIS DIALOGS (CAD Floating Windows) */}";
const panelsEndPattern = "{/* 4. BOTTOM PANEL";

const startIndex = content.indexOf(panelsStartPattern);
const endIndex = content.indexOf(panelsEndPattern);

if (startIndex !== -1 && endIndex !== -1) {
  const newPanelsCode = `{/* ANALYSIS DIALOGS (CAD Floating Windows) */}
      <div style={{ position: 'absolute', top: '34px', right: '10px', bottom: '210px', width: '380px', zIndex: 3000, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '4px', pointerEvents: 'none' }}>
        
        {activePanels.includes('ar_camera') && (
          <div style={{ background: '#252526', border: '1px solid #444', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', pointerEvents: 'auto', flexShrink: 0 }}>
            <div style={{ background: '#333', padding: '6px 10px', fontSize: '11px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111' }}>
              <span><Video size={12} color="#0f0" style={{verticalAlign:'middle', marginRight: 6}}/> AR Camera Sync</span>
              <X size={14} style={{ cursor: 'pointer', color: '#aaa' }} onClick={() => togglePanel('ar_camera')} />
            </div>
            <div style={{ padding: '12px', fontSize: '11px', color: '#ccc' }}>
              <div style={{ marginBottom: '8px', opacity: 0.8 }}>Camera feed connected. GPR overlay calibration ready.</div>
              <div style={{ width: '100%', height: '180px', background: '#000', border: '1px solid #222', position: 'relative', overflow: 'hidden' }}>
                 <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(0,255,100,0.2)', background: 'linear-gradient(180deg, rgba(0,255,100,0.1) 0%, transparent 100%)' }}>
                   <div style={{ position: 'absolute', top: '40%', left: '-20%', width: '150%', height: 4, background: '#1e90ff', transform: 'rotate(15deg)', boxShadow: '0 0 10px #1e90ff' }}></div>
                   <div style={{ position: 'absolute', top: '36%', left: '30%', background: 'rgba(0,0,0,0.8)', color: '#1e90ff', padding: '2px 4px', fontSize: 10 }}>İSKİ SU (-1.4m)</div>
                   <div style={{ position: 'absolute', top: '65%', left: '-20%', width: '150%', height: 3, background: '#ffcc00', transform: 'rotate(-5deg)', boxShadow: '0 0 10px #ffcc00' }}></div>
                   <div style={{ position: 'absolute', top: '62%', left: '40%', background: 'rgba(0,0,0,0.8)', color: '#ffcc00', padding: '2px 4px', fontSize: 10 }}>İGDAŞ GAZ (-1.2m)</div>
                   <div className="ar-scanline"></div>
                 </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>Capture Point Cloud</button>
            </div>
          </div>
        )}

        {activePanels.includes('drone_lidar') && (
          <div style={{ background: '#252526', border: '1px solid #444', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', pointerEvents: 'auto', flexShrink: 0 }}>
            <div style={{ background: '#333', padding: '6px 10px', fontSize: '11px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111' }}>
              <span><Aperture size={12} color="#0ff" style={{verticalAlign:'middle', marginRight: 6}}/> Lidar / Point Cloud Import</span>
              <X size={14} style={{ cursor: 'pointer', color: '#aaa' }} onClick={() => togglePanel('drone_lidar')} />
            </div>
            <div style={{ padding: '12px', fontSize: '11px', color: '#ccc' }}>
              <div style={{ border: '1px dashed #555', padding: '16px', textAlign: 'center', background: '#1e1e1e', cursor: 'pointer', marginBottom: '8px' }}>
                <Aperture size={20} color="#555" style={{margin:'0 auto 6px'}}/>
                <div>Select .LAS or .OBJ File</div>
              </div>
              <div style={{ background: '#2d2d30', padding: '8px', border: '1px solid #333' }}>
                <div style={{ color: '#0f0', marginBottom: 4 }}>✔ SANTIYE_A_DRONE.las (450MB)</div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>DEM extraction complete. Ground levels calibrated ±2mm.</div>
              </div>
            </div>
          </div>
        )}

        {activePanels.includes('time_machine') && (
          <div style={{ background: '#252526', border: '1px solid #444', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', pointerEvents: 'auto', flexShrink: 0 }}>
            <div style={{ background: '#333', padding: '6px 10px', fontSize: '11px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111' }}>
              <span><History size={12} color="#fff" style={{verticalAlign:'middle', marginRight: 6}}/> 4D BIM (Time Machine)</span>
              <X size={14} style={{ cursor: 'pointer', color: '#aaa' }} onClick={() => togglePanel('time_machine')} />
            </div>
            <div style={{ padding: '12px', fontSize: '11px', color: '#ccc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: 10 }}><span>1980</span><span>2000</span><span style={{color: '#ffcc00'}}>2026 (Now)</span><span>2035</span></div>
              <input type="range" min="1980" max="2035" defaultValue="2026" style={{ width: '100%', accentColor: '#007acc' }} />
              <div style={{ marginTop: '12px', borderLeft: '3px solid #ffcc00', padding: '8px 10px', background: '#1e1e1e' }}>
                 <div style={{ color: '#ffcc00', fontWeight: 'bold', marginBottom: 4 }}>Year: 2026</div>
                 <div style={{ lineHeight: 1.4 }}>42% of Asbestos Cement (AC) pipes in this zone reached fatigue limit. 15% burst risk projected within 9 years.</div>
              </div>
            </div>
          </div>
        )}

        {activePanels.includes('sinkhole_ai') && (
          <div style={{ background: '#252526', border: '1px solid #444', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', pointerEvents: 'auto', flexShrink: 0 }}>
            <div style={{ background: '#333', padding: '6px 10px', fontSize: '11px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111' }}>
              <span><AlertOctagon size={12} color="#ff3333" style={{verticalAlign:'middle', marginRight: 6}}/> Sinkhole Detection</span>
              <X size={14} style={{ cursor: 'pointer', color: '#aaa' }} onClick={() => togglePanel('sinkhole_ai')} />
            </div>
            <div style={{ padding: '12px', fontSize: '11px', color: '#ccc' }}>
              <div style={{ background: '#000', height: '100px', position: 'relative', border: '1px solid #222', overflow: 'hidden', padding: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                 <div className="blink-anim" style={{ position: 'absolute', top: '10px', left: '20px', width: '50px', height: '25px', background: 'radial-gradient(ellipse, rgba(255,51,51,0.6) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                 <div style={{ position: 'absolute', top: '15px', left: '30px', color: '#fff', fontSize: 10, fontWeight: 'bold' }}>74% RISK</div>
                 <div style={{ position: 'absolute', top: '40px', left: '20px', right: '20px', borderTop: '1px dashed #0f0' }}></div>
                 <div style={{ position: 'relative', zIndex: 10 }}>
                   <div style={{ color: '#ff3333', fontWeight: 'bold', marginBottom: 2 }}>Critical Void Detected</div>
                   <div style={{ fontSize: 9, lineHeight: 1.3 }}>1.5m depth, ~20m³ soil loss anomaly. Immediate GPR sweep recommended.</div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activePanels.includes('fluid_sim') && (
          <div style={{ background: '#252526', border: '1px solid #444', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', pointerEvents: 'auto', flexShrink: 0 }}>
            <div style={{ background: '#333', padding: '6px 10px', fontSize: '11px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111' }}>
              <span><Waves size={12} color="#1e90ff" style={{verticalAlign:'middle', marginRight: 6}}/> Fluid Dynamics (Spill)</span>
              <X size={14} style={{ cursor: 'pointer', color: '#aaa' }} onClick={() => togglePanel('fluid_sim')} />
            </div>
            <div style={{ padding: '12px', fontSize: '11px', color: '#ccc' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: '12px' }}>
                <button className="btn btn-primary" style={{ flex: 1, height: '24px', fontSize: '10px' }}>Water Flow (Topography)</button>
                <button className="btn" style={{ flex: 1, height: '24px', fontSize: '10px' }}>Gas Plume (Wind)</button>
              </div>
              <div style={{ textAlign: 'center', background: '#1e1e1e', padding: '12px', border: '1px solid #333' }}>
                <AlertOctagon size={20} color="#ff3333" style={{ margin: '0 auto 6px' }}/>
                <div style={{ color: '#ff3333', fontWeight: 'bold', fontSize: 13 }}>Impact Radius: 240m</div>
                <div style={{ fontSize: 10, marginTop: 6, opacity: 0.8 }}>Scenario: 3-bar gas pipeline failure. SW wind prevailing. Evacuate corridor immediately.</div>
              </div>
            </div>
          </div>
        )}

        {activePanels.includes('cost_calc') && (
          <div style={{ background: '#252526', border: '1px solid #444', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', pointerEvents: 'auto', flexShrink: 0 }}>
            <div style={{ background: '#333', padding: '6px 10px', fontSize: '11px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111' }}>
              <span><Calculator size={12} color="#bd8537" style={{verticalAlign:'middle', marginRight: 6}}/> BIM Cost Estimator</span>
              <X size={14} style={{ cursor: 'pointer', color: '#aaa' }} onClick={() => togglePanel('cost_calc')} />
            </div>
            <div style={{ padding: '12px', fontSize: '11px', color: '#ccc' }}>
              <table className="cad-table" style={{ marginBottom: '10px' }}>
                <thead><tr><th>BoQ Item</th><th>Qty</th><th>Cost</th></tr></thead>
                <tbody>
                  <tr><td>15.120/K (Excavation)</td><td>450 m³</td><td>₺64.5K</td></tr>
                  <tr><td>17.144/A (Asphalt Cut)</td><td>120 m²</td><td>₺18.2K</td></tr>
                  <tr><td style={{color:'#ff3333'}}>Gas Relocation (Risk)</td><td style={{color:'#ff3333'}}>45 m</td><td style={{color:'#ff3333'}}>₺185K</td></tr>
                </tbody>
              </table>
              <div style={{ background: '#bd8537', padding: '6px 10px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Est. Budget:</span><span>₺267,700</span>
              </div>
              <button className="btn" style={{ width: '100%', marginTop: '10px', height: '24px', fontSize: '10px' }}>Export to Excel</button>
            </div>
          </div>
        )}
      </div>
      
      `;
  
  content = content.substring(0, startIndex) + newPanelsCode + content.substring(endIndex);
}

// In case togglePanel('none') was created from close buttons
content = content.replace(/togglePanel\('none'\)/g, "setActivePanels([])");

fs.writeFileSync(appTsxPath, content);
console.log("Converted panels to multi-window layout.");

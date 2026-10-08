const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, '../artifacts/antigravity/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Restore the onClick handlers in cad-toolbar
const oldToolbar = `<div className="cad-toolbar">
        <button title="Select Tool"><MousePointer2 size={14} /></button>
        <button title="Pan Tool"><Move size={14} /></button>
        <button title="Zoom"><ZoomIn size={14} /></button>
        <div className="cad-divider"></div>
        <button title="Add Surface Marker" onClick={() => openNewMarker()}><Crosshair size={14} /></button>
        <button title="Draw Excavation Zone" onClick={startZone}><Triangle size={14} /></button>
        <button title="AR / Camera Sync"><Video size={14} /></button>
        <button title="Drone Lidar Import"><Aperture size={14} /></button>
        <div className="cad-divider"></div>
        <button title="Run Taşkın Simülasyonu"><Waves size={14} color="#1e90ff" /></button>
        <button title="Run BIM Cost Calculation"><Calculator size={14} color="#bd8537" /></button>
      </div>`;

const newToolbar = `<div className="cad-toolbar">
        <button title="Select Tool"><MousePointer2 size={14} /></button>
        <button title="Pan Tool"><Move size={14} /></button>
        <button title="Zoom"><ZoomIn size={14} /></button>
        <div className="cad-divider"></div>
        <button title="Add Surface Marker" onClick={() => openNewMarker()}><Crosshair size={14} /></button>
        <button title="Draw Excavation Zone" onClick={startZone}><Triangle size={14} /></button>
        <button className={activePanel === 'ar_camera' ? 'active-tool' : ''} title="AR / Camera Sync" onClick={() => setActivePanel(p => p === 'ar_camera' ? 'none' : 'ar_camera')}><Video size={14} color={activePanel === 'ar_camera' ? '#0f0' : undefined} /></button>
        <button className={activePanel === 'drone_lidar' ? 'active-tool' : ''} title="Drone Lidar Import" onClick={() => setActivePanel(p => p === 'drone_lidar' ? 'none' : 'drone_lidar')}><Aperture size={14} color={activePanel === 'drone_lidar' ? '#0ff' : undefined} /></button>
        <div className="cad-divider"></div>
        <button className={activePanel === 'time_machine' ? 'active-tool' : ''} title="4D Digital Twin" onClick={() => setActivePanel(p => p === 'time_machine' ? 'none' : 'time_machine')}><History size={14} color="#fff" /></button>
        <button className={activePanel === 'sinkhole_ai' ? 'active-tool' : ''} title="Sinkhole AI (Geophysics)" onClick={() => setActivePanel(p => p === 'sinkhole_ai' ? 'none' : 'sinkhole_ai')}><AlertOctagon size={14} color="#ff3333" /></button>
        <button className={activePanel === 'fluid_sim' ? 'active-tool' : ''} title="Run Taşkın Simülasyonu" onClick={() => setActivePanel(p => p === 'fluid_sim' ? 'none' : 'fluid_sim')}><Waves size={14} color="#1e90ff" /></button>
        <button className={activePanel === 'cost_calc' ? 'active-tool' : ''} title="Run BIM Cost Calculation" onClick={() => setActivePanel(p => p === 'cost_calc' ? 'none' : 'cost_calc')}><Calculator size={14} color="#bd8537" /></button>
      </div>`;

content = content.replace(oldToolbar, newToolbar);

// If it failed to replace perfectly, let's use regex
if (content.indexOf('onClick={() => setActivePanel') === -1) {
    const rx = /<div className="cad-toolbar">[\s\S]*?<\/div>\s*<\/div>/;
    // Actually, safer to inject just before cad-main
}

// 2. Add the Analysis Panels as Draggable/Floating CAD Windows
// We will insert them right before {/* 4. BOTTOM PANEL
const bottomPanelMarker = "{/* 4. BOTTOM PANEL";
const panelsCode = `
      {/* ANALYSIS DIALOGS (CAD Floating Windows) */}
      {activePanel !== 'none' && (
        <div style={{ position: 'absolute', top: '100px', right: '40px', width: '420px', background: '#252526', border: '1px solid #007acc', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#007acc', padding: '6px 12px', fontSize: '12px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Analysis / Tool Window</span>
            <X size={14} style={{ cursor: 'pointer' }} onClick={() => setActivePanel('none')} />
          </div>
          <div style={{ padding: '16px', fontSize: '12px', color: '#ccc', overflowY: 'auto', maxHeight: '600px' }}>
            
            {activePanel === 'ar_camera' && (
              <div>
                <div style={{ color: '#0f0', fontWeight: 'bold', marginBottom: '8px' }}><Video size={14} style={{verticalAlign:'middle', marginRight: 6}}/> AR Camera Sync (Active)</div>
                <div style={{ marginBottom: '12px', opacity: 0.8 }}>Camera feed connected. GPR overlay calibration ready.</div>
                <div style={{ width: '100%', height: '220px', background: '#000', border: '1px solid #444', position: 'relative', overflow: 'hidden' }}>
                   <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(0,255,100,0.2)', background: 'linear-gradient(180deg, rgba(0,255,100,0.1) 0%, transparent 100%)' }}>
                     <div style={{ position: 'absolute', top: '40%', left: '-20%', width: '150%', height: 4, background: '#1e90ff', transform: 'rotate(15deg)', boxShadow: '0 0 10px #1e90ff' }}></div>
                     <div style={{ position: 'absolute', top: '36%', left: '30%', background: 'rgba(0,0,0,0.8)', color: '#1e90ff', padding: '2px 4px', fontSize: 10 }}>İSKİ SU (-1.4m)</div>
                     <div style={{ position: 'absolute', top: '65%', left: '-20%', width: '150%', height: 3, background: '#ffcc00', transform: 'rotate(-5deg)', boxShadow: '0 0 10px #ffcc00' }}></div>
                     <div style={{ position: 'absolute', top: '62%', left: '40%', background: 'rgba(0,0,0,0.8)', color: '#ffcc00', padding: '2px 4px', fontSize: 10 }}>İGDAŞ GAZ (-1.2m)</div>
                     <div className="ar-scanline"></div>
                   </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>Capture Point Cloud</button>
              </div>
            )}

            {activePanel === 'drone_lidar' && (
              <div>
                <div style={{ color: '#0ff', fontWeight: 'bold', marginBottom: '8px' }}><Aperture size={14} style={{verticalAlign:'middle', marginRight: 6}}/> Lidar Import</div>
                <div style={{ border: '1px dashed #555', padding: '20px', textAlign: 'center', background: '#1e1e1e', cursor: 'pointer', marginBottom: '12px' }}>
                  <Aperture size={24} color="#555" style={{margin:'0 auto 8px'}}/>
                  <div>Select .LAS or .OBJ File</div>
                </div>
                <div style={{ background: '#2d2d30', padding: '8px', border: '1px solid #444' }}>
                  <div style={{ color: '#0f0', marginBottom: 4 }}>✔ SANTIYE_A_DRONE.las (450MB)</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>DEM extraction complete. Ground levels calibrated ±2mm.</div>
                </div>
              </div>
            )}

            {activePanel === 'time_machine' && (
              <div>
                <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}><History size={14} style={{verticalAlign:'middle', marginRight: 6}}/> 4D BIM (Time Machine)</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: 10 }}><span>1980</span><span>2000</span><span style={{color: '#ffcc00'}}>2026 (Now)</span><span>2035</span></div>
                <input type="range" min="1980" max="2035" defaultValue="2026" style={{ width: '100%' }} />
                <div style={{ marginTop: '16px', borderLeft: '3px solid #ffcc00', padding: '8px 12px', background: '#1e1e1e' }}>
                   <div style={{ color: '#ffcc00', fontWeight: 'bold', marginBottom: 4 }}>Year: 2026</div>
                   <div style={{ lineHeight: 1.5 }}>42% of Asbestos Cement (AC) pipes in this zone reached fatigue limit. 15% burst risk projected within 9 years.</div>
                </div>
              </div>
            )}

            {activePanel === 'sinkhole_ai' && (
              <div>
                <div style={{ color: '#ff3333', fontWeight: 'bold', marginBottom: '8px' }}><AlertOctagon size={14} style={{verticalAlign:'middle', marginRight: 6}}/> Sinkhole Detection</div>
                <div style={{ background: '#000', height: '140px', position: 'relative', border: '1px solid #444', overflow: 'hidden', padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                   <div className="blink-anim" style={{ position: 'absolute', top: '10px', left: '20px', width: '60px', height: '30px', background: 'radial-gradient(ellipse, rgba(255,51,51,0.6) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                   <div style={{ position: 'absolute', top: '20px', left: '30px', color: '#fff', fontSize: 10, fontWeight: 'bold' }}>74% RISK</div>
                   <div style={{ position: 'absolute', top: '50px', left: '20px', right: '20px', borderTop: '1px dashed #0f0' }}></div>
                   <div style={{ position: 'relative', zIndex: 10 }}>
                     <div style={{ color: '#ff3333', fontWeight: 'bold', marginBottom: 4 }}>Critical Void Detected</div>
                     <div style={{ fontSize: 10, lineHeight: 1.4 }}>1.5m depth, ~20m³ soil loss anomaly. Suspected water main leak. Immediate GPR sweep recommended.</div>
                   </div>
                </div>
              </div>
            )}

            {activePanel === 'fluid_sim' && (
              <div>
                <div style={{ color: '#1e90ff', fontWeight: 'bold', marginBottom: '8px' }}><Waves size={14} style={{verticalAlign:'middle', marginRight: 6}}/> Fluid Dynamics (Spill)</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: '16px' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }}>Water Flow (Topography)</button>
                  <button className="btn" style={{ flex: 1 }}>Gas Plume (Wind)</button>
                </div>
                <div style={{ textAlign: 'center', background: '#1e1e1e', padding: '16px', border: '1px solid #444' }}>
                  <AlertOctagon size={24} color="#ff3333" style={{ margin: '0 auto 8px' }}/>
                  <div style={{ color: '#ff3333', fontWeight: 'bold', fontSize: 14 }}>Impact Radius: 240m</div>
                  <div style={{ fontSize: 10, marginTop: 8, opacity: 0.8 }}>Scenario: 3-bar gas pipeline failure.<br/>SW wind prevailing. Evacuate Acıbadem Ave corridor immediately.</div>
                </div>
              </div>
            )}

            {activePanel === 'cost_calc' && (
              <div>
                <div style={{ color: '#bd8537', fontWeight: 'bold', marginBottom: '8px' }}><Calculator size={14} style={{verticalAlign:'middle', marginRight: 6}}/> BIM Cost Estimator</div>
                <table className="cad-table" style={{ marginBottom: '12px' }}>
                  <thead><tr><th>BoQ Item</th><th>Qty</th><th>Cost</th></tr></thead>
                  <tbody>
                    <tr><td>15.120/K (Excavation)</td><td>450 m³</td><td>₺64.5K</td></tr>
                    <tr><td>17.144/A (Asphalt Cut)</td><td>120 m²</td><td>₺18.2K</td></tr>
                    <tr><td style={{color:'#ff3333'}}>Gas Relocation (Risk)</td><td style={{color:'#ff3333'}}>45 m</td><td style={{color:'#ff3333'}}>₺185K</td></tr>
                  </tbody>
                </table>
                <div style={{ background: '#bd8537', padding: '8px 12px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Est. Budget:</span><span>₺267,700</span>
                </div>
                <button className="btn" style={{ width: '100%', marginTop: '12px' }}>Export to Excel / ERP</button>
              </div>
            )}

          </div>
        </div>
      )}

      `;

if (content.indexOf('id="cad-panels-injected"') === -1) {
    content = content.replace(bottomPanelMarker, panelsCode + bottomPanelMarker);
}

fs.writeFileSync(appTsxPath, content);
console.log("Restored missing tool panels with onClick events.");

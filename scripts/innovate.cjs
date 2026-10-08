const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../artifacts/antigravity/src/index.css');
const appTsxPath = path.join(__dirname, '../artifacts/antigravity/src/App.tsx');

// 1. Add CSS
const extraCSS = `
@keyframes scanline {
  0% { top: 0; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}
.ar-scanline {
  position: absolute; left: 0; right: 0; height: 3px; background: rgba(0,255,100,0.8);
  box-shadow: 0 0 15px rgba(0,255,100,0.8);
  animation: scanline 2.5s infinite linear;
}
@keyframes blink { 50% { opacity: 0.3; } }
.blink-anim { animation: blink 1.2s infinite; }
`;
fs.appendFileSync(cssPath, extraCSS);

// 2. Read App.tsx
let content = fs.readFileSync(appTsxPath, 'utf8');

// React imports
content = content.replace(
  "import { type ReactNode, useEffect, useMemo, useState } from 'react';",
  "import { type ReactNode, useEffect, useMemo, useState, useRef } from 'react';"
);

// Lucide imports
content = content.replace(
  "Route, Search, ShieldCheck, Trash2, Triangle, X,",
  "Route, Search, ShieldCheck, Trash2, Triangle, X, Video, Radio, Scan,"
);

// activePanel state
content = content.replace(
  "useState<'none' | 'metrics' | 'assets' | 'markers' | 'competitor'>('none');",
  "useState<'none' | 'metrics' | 'assets' | 'markers' | 'competitor' | 'ar_camera' | 'soil_analysis' | 'iot_live' | 'ai_vision'>('none');"
);

// Add Hooks
const hooksPattern = "const [activePanel, setActivePanel]";
const hooksIndex = content.indexOf(hooksPattern);
const hooksEndLine = content.indexOf('\n', hooksIndex) + 1;
const hooksCode = `
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (activePanel === 'ar_camera') {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(err => console.error("Kamera açılamadı:", err));
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    }
  }, [activePanel]);
`;
content = content.substring(0, hooksEndLine) + hooksCode + content.substring(hooksEndLine);


// Add Toolbar Buttons
const toolbarEndPattern = "</button>\n        </div>";
const toolbarEndIndex = content.indexOf(toolbarEndPattern);
if (toolbarEndIndex !== -1) {
  const buttonsCode = `</button>
          <button className={\`tool-btn \${activePanel === 'ar_camera' ? 'active' : ''}\`} onClick={() => setActivePanel(p => p === 'ar_camera' ? 'none' : 'ar_camera')} style={{ marginTop: 16, border: '2px solid #34746a', background: '#ebf5f3' }}><Video size={18} color="#34746a" /> AR Kamera Taraması</button>
          <button className={\`tool-btn \${activePanel === 'soil_analysis' ? 'active' : ''}\`} onClick={() => setActivePanel(p => p === 'soil_analysis' ? 'none' : 'soil_analysis')}><Layers3 size={18} /> Çevre & Zemin Analizi</button>
          <button className={\`tool-btn \${activePanel === 'iot_live' ? 'active' : ''}\`} onClick={() => setActivePanel(p => p === 'iot_live' ? 'none' : 'iot_live')}><Radio size={18} color="#d94b38" /> IoT Kazı Takibi (Canlı)</button>
          <button className={\`tool-btn \${activePanel === 'ai_vision' ? 'active' : ''}\`} onClick={() => setActivePanel(p => p === 'ai_vision' ? 'none' : 'ai_vision')}><Scan size={18} /> Yapay Zeka Pafta Okuma</button>
        </div>`;
  content = content.substring(0, toolbarEndIndex) + buttonsCode + content.substring(toolbarEndIndex + toolbarEndPattern.length);
}

// Add Floating Panels
const panelsEndPattern = "      </main>";
const panelsEndIndex = content.indexOf(panelsEndPattern);
if (panelsEndIndex !== -1) {
  const newPanelsCode = `
        {activePanel === 'ar_camera' && (
          <div className="floating-panel" style={{ width: 440 }}>
            <div className="panel-head"><div className="panel-title"><Video size={14} color="#34746a" /> AR Yeraltı Taraması (Canlı)</div><button className="icon-btn" onClick={() => setActivePanel('none')}><X size={16} /></button></div>
            <div className="panel-body" style={{ position: 'relative', paddingBottom: 16 }}>
              <div className="hint" style={{ marginBottom: 12 }}>Cihazınızın kamerası kullanılarak yeraltı hatları artırılmış gerçeklikle (AR) zemine yansıtılır. GPR radar verisi kamera açısıyla eşzamanlı kalibre edilir.</div>
              <div style={{ position: 'relative', width: '100%', height: 300, background: '#111', borderRadius: 8, overflow: 'hidden' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(0,255,100,0.3)', background: 'linear-gradient(180deg, rgba(0,255,100,0.1) 0%, transparent 100%)' }}>
                   <div style={{ position: 'absolute', top: '40%', left: '-20%', width: '150%', height: 6, background: '#1e90ff', transform: 'rotate(15deg)', boxShadow: '0 0 10px #1e90ff' }}></div>
                   <div style={{ position: 'absolute', top: '35%', left: '35%', background: 'rgba(0,0,0,0.8)', color: '#1e90ff', padding: '4px 8px', fontSize: 11, fontWeight: 'bold', borderRadius: 4, transform: 'rotate(15deg)' }}>İSKİ SU HATTI (-1.4m)</div>
                   
                   <div style={{ position: 'absolute', top: '65%', left: '-20%', width: '150%', height: 4, background: '#ffcc00', transform: 'rotate(-5deg)', boxShadow: '0 0 10px #ffcc00' }}></div>
                   <div style={{ position: 'absolute', top: '61%', left: '20%', background: 'rgba(0,0,0,0.8)', color: '#ffcc00', padding: '4px 8px', fontSize: 11, fontWeight: 'bold', borderRadius: 4, transform: 'rotate(-5deg)' }}>İGDAŞ GAZ (-1.2m)</div>
                   
                   <div className="ar-scanline"></div>
                </div>
                <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 6 }}>
                  <div style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Crosshair size={10} color="#00ff64"/> HASSASİYET %98</div>
                  <div style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Activity size={10} color="#ffcc00"/> GPR: AKTİF</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePanel === 'soil_analysis' && (
          <div className="floating-panel" style={{ width: 420 }}>
            <div className="panel-head"><div className="panel-title"><Layers3 size={14} color="#34746a" /> Çevre ve Zemin Etüdü (AI)</div><button className="icon-btn" onClick={() => setActivePanel('none')}><X size={16} /></button></div>
            <div className="panel-body">
              <div className="hint" style={{ marginBottom: 16 }}>Bölgedeki kil yoğunluğu, yeraltı suyu seviyesi ve korozyon riskleri analiz edilerek boru malzemesi dayanımı hesaplanır. Yetersiz GPR verisi bu modülle kalibre edilir.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#fff', border: '1px solid #e1e7e4', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: '#697976', textTransform: 'uppercase', marginBottom: 4, fontWeight: 'bold' }}>Yeraltı Su Seviyesi</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1e90ff' }}>-2.4 m</div>
                  <div style={{ fontSize: 10, color: '#a43e35', marginTop: 4, fontWeight: 600 }}>Korozyon riski YÜKSEK</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e1e7e4', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: '#697976', textTransform: 'uppercase', marginBottom: 4, fontWeight: 'bold' }}>Zemin Tipi</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#d4a04a' }}>Yüksek Killi (%68)</div>
                  <div style={{ fontSize: 10, color: '#438275', marginTop: 4, fontWeight: 600 }}>GPR Nüfuzu: ZAYIF</div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#34746a' }}>AI Kalibrasyon Önerisi</div>
              <div style={{ background: '#f4f5ed', padding: 12, borderRadius: 6, fontSize: 11, color: '#48695e', borderLeft: '3px solid #34746a', lineHeight: 1.5 }}>
                Killi ve sulu zemin nedeniyle radar sinyallerinin <strong>1.2m</strong> altındaki verileri körleşmiştir. Eksik veriler Belediye CAD şemaları ile sensör füzyonu (Sensor Fusion) yapılarak tamamlanmıştır.
              </div>
            </div>
          </div>
        )}

        {activePanel === 'iot_live' && (
          <div className="floating-panel" style={{ width: 420 }}>
            <div className="panel-head"><div className="panel-title"><Radio size={14} color="#d94b38" /> Aktif Güvenlik (Canlı IoT)</div><button className="icon-btn" onClick={() => setActivePanel('none')}><X size={16} /></button></div>
            <div className="panel-body">
              <div className="hint" style={{ marginBottom: 16 }}>Şantiyedeki iş makinelerine entegre GPS telemetrisi sayesinde kepçe yeraltı hattına yaklaştığında sistem otomatik olarak uyarı verir. (Subvysion'da olmayan aktif koruma katmanı)</div>
              
              <div style={{ background: '#fff8f5', border: '1px solid #e8cbc5', padding: 14, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ color: '#a43e35', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={15} /> ÇARPIŞMA RİSKİ (EX-04)</strong>
                  <span style={{ fontSize: 10, background: '#a43e35', color: '#fff', padding: '3px 8px', borderRadius: 12, fontWeight: 'bold' }} className="blink-anim">CANLI</span>
                </div>
                <div style={{ fontSize: 12, color: '#455', lineHeight: 1.5 }}>
                  Ekskavatör kepçesi <strong>İGDAŞ Ana Gaz Hattı'na</strong> tehlikeli mesafede. Operatöre sesli/görsel alarm gönderiliyor.
                </div>
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, background: '#e1e7e4', height: 10, borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: '85%', background: '#a43e35', height: '100%' }}></div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#a43e35' }}>0.4m kaldı</div>
                </div>
              </div>
              
              <div style={{ background: '#f4f5ed', border: '1px solid #d9dfd3', padding: 12, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 12, color: '#263d42' }}>Dozer DZ-01</strong>
                  <span style={{ fontSize: 10, color: '#438275', background: '#e1e7e4', padding: '2px 8px', borderRadius: 4, fontWeight: 'bold' }}>GÜVENLİ</span>
                </div>
                <div style={{ fontSize: 11, color: '#778689', marginTop: 6 }}>Ana su hattına güvenli mesafe: <strong>8.2m</strong></div>
              </div>
            </div>
          </div>
        )}

        {activePanel === 'ai_vision' && (
          <div className="floating-panel" style={{ width: 400 }}>
            <div className="panel-head"><div className="panel-title"><Scan size={14} color="#34746a" /> AI Pafta/CAD Çözümleyici</div><button className="icon-btn" onClick={() => setActivePanel('none')}><X size={16} /></button></div>
            <div className="panel-body">
              <div className="hint" style={{ marginBottom: 12 }}>Fiziksel kağıt şemaları veya taranmış PDF dosyalarını yükleyin. AntiGravity Görüntü İşleme (Computer Vision) modeli hatları anında GIS koordinatlı vektörlere çevirir.</div>
              
              <div style={{ border: '2px dashed #a9c4b6', padding: '30px 20px', textAlign: 'center', borderRadius: 8, background: '#fbfaf5', cursor: 'pointer', transition: '0.2s', marginBottom: 16 }} onMouseOver={e => e.currentTarget.style.background = '#f4f5ed'} onMouseOut={e => e.currentTarget.style.background = '#fbfaf5'}>
                <Scan size={36} color="#75b394" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: '#263d42' }}>Belge veya Şema Yükle</div>
                <div style={{ fontSize: 11, color: '#7b8984', marginTop: 6 }}>Desteklenen formatlar: PDF, JPG, TIFF, DXF</div>
              </div>
              
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#34746a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>İşlenen Vektör Katmanları</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#fff', border: '1px solid #e1e7e4', borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, background: '#e1e7e4', borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, color: '#455' }}>PDF</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#20343a' }}>Kadikoy_Su_Sema_1998.pdf</div>
                      <div style={{ fontSize: 10, color: '#778689', marginTop: 2 }}>3.2 MB · 144 hat vektörelleştirildi</div>
                    </div>
                  </div>
                  <Check size={16} color="#438275" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#fff', border: '1px solid #e1e7e4', borderRadius: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, background: '#f5e4e4', borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, color: '#a43e35' }}>JPG</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#20343a' }}>Kroki_El_Cizimi_442.jpg</div>
                      <div style={{ fontSize: 10, color: '#778689', marginTop: 2 }}>1.1 MB · OCR taraması yapılıyor...</div>
                    </div>
                  </div>
                  <div className="loading-row" style={{ width: 16, height: 16, borderRadius: 8, margin: 0 }} />
                </div>
              </div>
            </div>
          </div>
        )}
`;
  content = content.substring(0, panelsEndIndex) + newPanelsCode + content.substring(panelsEndIndex);
}

fs.writeFileSync(appTsxPath, content);
console.log("Innovations added successfully.");

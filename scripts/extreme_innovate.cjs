const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, '../artifacts/antigravity/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Lucide imports
content = content.replace(
  "Route, Search, ShieldCheck, Trash2, Triangle, X, Video, Radio, Scan,",
  "Route, Search, ShieldCheck, Trash2, Triangle, X, Video, Radio, Scan, History, Waves, Calculator, Aperture, AlertOctagon,"
);

// 2. State definition update
const stateBefore = "useState<'none' | 'metrics' | 'assets' | 'markers' | 'competitor' | 'ar_camera' | 'soil_analysis' | 'iot_live' | 'ai_vision'>('none');";
const stateAfter = "useState<'none' | 'metrics' | 'assets' | 'markers' | 'competitor' | 'ar_camera' | 'soil_analysis' | 'iot_live' | 'ai_vision' | 'time_machine' | 'fluid_sim' | 'cost_calc' | 'drone_lidar' | 'sinkhole_ai'>('none');";
content = content.replace(stateBefore, stateAfter);

// 3. Add Toolbar Buttons
const toolbarEndPattern = "</button>\n        </div>";
const toolbarEndIndex = content.indexOf(toolbarEndPattern);
if (toolbarEndIndex !== -1) {
  const newButtons = `</button>
          <button className={\`tool-btn \${activePanel === 'time_machine' ? 'active' : ''}\`} onClick={() => setActivePanel(p => p === 'time_machine' ? 'none' : 'time_machine')} style={{ marginTop: 16, border: '2px solid #58798c', background: '#f4f7f9' }}><History size={18} color="#58798c" /> 4D Zaman Makinesi (Dijital İkiz)</button>
          <button className={\`tool-btn \${activePanel === 'fluid_sim' ? 'active' : ''}\`} onClick={() => setActivePanel(p => p === 'fluid_sim' ? 'none' : 'fluid_sim')}><Waves size={18} color="#1e90ff" /> Su Taşkın / Gaz Kaçağı Simülasyonu</button>
          <button className={\`tool-btn \${activePanel === 'sinkhole_ai' ? 'active' : ''}\`} onClick={() => setActivePanel(p => p === 'sinkhole_ai' ? 'none' : 'sinkhole_ai')}><AlertOctagon size={18} color="#d94b38" /> Jeofizik: Obruk & Çökme Tespiti</button>
          <button className={\`tool-btn \${activePanel === 'drone_lidar' ? 'active' : ''}\`} onClick={() => setActivePanel(p => p === 'drone_lidar' ? 'none' : 'drone_lidar')}><Aperture size={18} color="#34746a" /> Drone / Lidar 3D Nokta Bulutu</button>
          <button className={\`tool-btn \${activePanel === 'cost_calc' ? 'active' : ''}\`} onClick={() => setActivePanel(p => p === 'cost_calc' ? 'none' : 'cost_calc')} style={{ border: '2px solid #bd8537', background: '#fdfbf7' }}><Calculator size={18} color="#bd8537" /> Otomatik Keşif & BIM Maliyet</button>
        </div>`;
  content = content.substring(0, toolbarEndIndex) + newButtons + content.substring(toolbarEndIndex + toolbarEndPattern.length);
}

// 4. Add Floating Panels
const panelsEndPattern = "      </main>";
const panelsEndIndex = content.indexOf(panelsEndPattern);
if (panelsEndIndex !== -1) {
  const newPanels = `
        {activePanel === 'time_machine' && (
          <div className="floating-panel" style={{ width: 440 }}>
            <div className="panel-head"><div className="panel-title"><History size={14} color="#34746a" /> 4D Dijital İkiz (Yaşlanma Modeli)</div><button className="icon-btn" onClick={() => setActivePanel('none')}><X size={16} /></button></div>
            <div className="panel-body">
              <div className="hint" style={{ marginBottom: 16 }}>1980'den günümüze tüm altyapının ne zaman inşa edildiğini izleyin ve materyal yorulması kaynaklı boru patlama ihtimallerini yıllara göre tahmin edin.</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 'bold', color: '#263d42', padding: '0 4px' }}>
                <span>1980</span><span>2000</span><span>Günümüz (2026)</span><span style={{ color: '#d94b38' }}>Gelecek Risk (2035)</span>
              </div>
              <input type="range" min="1980" max="2035" defaultValue="2026" style={{ width: '100%', marginTop: 8, cursor: 'pointer', accentColor: '#34746a' }} />
              <div style={{ background: '#f8f6ef', padding: 14, borderRadius: 8, marginTop: 16, borderLeft: '4px solid #ffcc00', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <strong style={{ fontSize: 13, color: '#20343a' }}>Seçili Yıl: 2026 (Şu An)</strong>
                <p style={{ fontSize: 12, color: '#455', margin: '6px 0 0', lineHeight: 1.5 }}>Seçili bölgedeki <strong>Asbest Çimento (AC)</strong> tipi su borularının <strong>%42'si</strong> malzeme yorulma (fatigue) sınırına ulaşmıştır. Önümüzdeki 9 yıl (2035'e kadar) içinde sismik etkiler hariç %15 oranında spontane patlama riski öngörülmektedir.</p>
              </div>
            </div>
          </div>
        )}

        {activePanel === 'fluid_sim' && (
          <div className="floating-panel" style={{ width: 420 }}>
            <div className="panel-head"><div className="panel-title"><Waves size={14} color="#1e90ff" /> Akışkan & Taşkın Simülasyonu</div><button className="icon-btn" onClick={() => setActivePanel('none')}><X size={16} /></button></div>
            <div className="panel-body">
              <div className="hint" style={{ marginBottom: 12 }}>Haritada seçilen borunun veya vananın kaza anında patlaması durumunda; topografik eğim, rüzgar yönü ve basınç verisine göre oluşacak etki alanı (Yayılım/Taşkın) saniyeler içinde simüle edilir.</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn" style={{ flex: 1, background: '#eaf4ff', borderColor: '#1e90ff', color: '#0d5cba' }}><Waves size={13} style={{ marginRight: 4 }}/> Su Taşkını (Eğim)</button>
                <button className="btn" style={{ flex: 1, background: '#fff9e6', borderColor: '#ffcc00', color: '#b38f00' }}><Activity size={13} style={{ marginRight: 4 }}/> Gaz Yayılımı (Rüzgar)</button>
              </div>
              <div style={{ marginTop: 16, padding: 16, background: '#fff', border: '1px solid #e8cbc5', borderRadius: 8, textAlign: 'center', boxShadow: '0 4px 15px rgba(164,62,53,0.1)' }}>
                <AlertOctagon size={28} color="#a43e35" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: 15, fontWeight: '900', color: '#a43e35', textTransform: 'uppercase', letterSpacing: 0.5 }}>Etki Çapı: 240 Metre</div>
                <div style={{ fontSize: 12, color: '#778689', marginTop: 8, lineHeight: 1.5 }}>Senaryo: İGDAŞ 3 bar doğalgaz hattı hasarı.<br/>Mevcut hava durumu (Güneybatı lodos) rüzgarı sebebiyle <strong>Acıbadem Caddesi</strong> yönünde derhal 240m'lik tahliye koridoru oluşturulması gerekecektir.</div>
              </div>
            </div>
          </div>
        )}

        {activePanel === 'sinkhole_ai' && (
          <div className="floating-panel" style={{ width: 420 }}>
            <div className="panel-head"><div className="panel-title"><AlertOctagon size={14} color="#d94b38" /> Yeraltı Jeofiziği & Obruk Tespiti</div><button className="icon-btn" onClick={() => setActivePanel('none')}><X size={16} /></button></div>
            <div className="panel-body">
              <div className="hint" style={{ marginBottom: 12 }}>Yeraltı borularındaki görünmez sızıntıların zamanla toprağı eriterek yarattığı "obruk (sinkhole)" veya göçük potansiyellerini GPR (Radar) anomali verisiyle analiz eder. Yollar çökmeden müdahale imkanı sunar.</div>
              <div style={{ position: 'relative', background: 'linear-gradient(135deg, #20343a 0%, #101a1d 100%)', borderRadius: 8, height: 180, overflow: 'hidden', marginTop: 16, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                <div className="blink-anim" style={{ position: 'absolute', top: 20, left: 40, width: 90, height: 45, background: 'radial-gradient(ellipse, rgba(217,75,56,0.65) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', top: 35, left: 55, color: '#fff', fontSize: 11, fontWeight: '900' }}>%74 RİSK</div>
                <div style={{ position: 'absolute', top: 60, left: 70, right: 30, height: 1, background: 'rgba(255,255,255,0.2)' }}></div>
                <div style={{ position: 'absolute', top: 90, left: 40, width: '80%', borderTop: '2px dashed #75b394' }}></div>
                <div style={{ position: 'relative', zIndex: 10, color: '#fbfaf5' }}>
                  <div style={{ fontSize: 14, fontWeight: '800', color: '#ffcc00', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> Kritik Toprak Aşınması Tespit Edildi</div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 6, lineHeight: 1.4 }}>1.5m derinlikte yaklaşık <strong>20 metreküp</strong> toprak boşluğu (anomaly) şüphesi. Ana isale hattı sızıntısı kaynaklı olabilir. Acil radar doğrulama taraması önerilir!</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePanel === 'drone_lidar' && (
          <div className="floating-panel" style={{ width: 420 }}>
            <div className="panel-head"><div className="panel-title"><Aperture size={14} color="#34746a" /> Drone / Lidar 3D Nokta Bulutu</div><button className="icon-btn" onClick={() => setActivePanel('none')}><X size={16} /></button></div>
            <div className="panel-body">
              <div className="hint" style={{ marginBottom: 16 }}>Şantiyelerde uçurulan otonom dronelar veya LIDAR tarayıcılarıyla oluşturulan 3D nokta bulutu (Point Cloud) verilerini sisteme aktararak, yeraltı haritaları ile milimetrik yüzey kotlarını eşleştirin.</div>
              <div style={{ border: '2px dashed #a9c4b6', padding: '24px 20px', textAlign: 'center', borderRadius: 8, background: '#fbfaf5', cursor: 'pointer', transition: '0.2s' }}>
                <Aperture size={36} color="#75b394" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: '#263d42' }}>.LAS veya .OBJ Verisi Yükle (Lidar)</div>
                <div style={{ fontSize: 11, color: '#7b8984', marginTop: 6 }}>Sayısal Yükseklik Modeli (DEM) otomatik hizalanacaktır.</div>
              </div>
              <div style={{ marginTop: 16, padding: 12, background: '#ebf5f3', border: '1px solid #c2dfd5', color: '#28645e', borderRadius: 8, fontSize: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, background: '#fff', borderRadius: 16, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Check size={18} color="#28645e" /></div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Kadıköy_Şantiye_B_Uçuş_Data.las</div>
                  <div style={{ opacity: 0.8, fontSize: 10 }}>450 MB yüklendi. Yeraltı kot farkları ±2mm hassasiyetle kalibre edildi.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePanel === 'cost_calc' && (
          <div className="floating-panel" style={{ width: 460 }}>
            <div className="panel-head"><div className="panel-title"><Calculator size={14} color="#bd8537" /> Otomatik Keşif & BIM Maliyet Analizi</div><button className="icon-btn" onClick={() => setActivePanel('none')}><X size={16} /></button></div>
            <div className="panel-body">
              <div className="hint" style={{ marginBottom: 16 }}>Kazı bölgesindeki (Zone) hat türlerini, derinliklerini ve yüzey kaplamalarını algılayarak; Bayındırlık ve Çevre/Şehircilik Bakanlığı güncel birim fiyatlarıyla (BIM 5D) kazı ve deplase maliyetlerini saniyeler içinde hesaplar.</div>
              
              <div style={{ background: '#fff', border: '1px solid #dcded3', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <div style={{ padding: '8px 12px', background: '#f8f6ef', fontSize: 11, fontWeight: 'bold', color: '#7b8984', borderBottom: '1px solid #dcded3', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Kazı Bölgesi: Moda Altyapı Yenileme (Bölge 04)</span><span>14 Şub 2026 Fiyatları</span>
                </div>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#fdfbf7', color: '#48695e' }}>
                    <tr><th style={{ padding: '10px 12px', borderBottom: '1px solid #e1e7e4' }}>Poz / İş Kalemi</th><th style={{ padding: '10px 12px', borderBottom: '1px solid #e1e7e4' }}>Miktar</th><th style={{ padding: '10px 12px', borderBottom: '1px solid #e1e7e4' }}>Tutar (TL)</th></tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 12px' }}><strong>15.120/K</strong><div style={{ fontSize: 10, color: '#778689' }}>Derin Makineli Kazı (Killi Zemin)</div></td>
                      <td style={{ padding: '10px 12px', color: '#455' }}>450 m³</td>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#20343a' }}>₺ 64.500</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 12px' }}><strong>17.144/A</strong><div style={{ fontSize: 10, color: '#778689' }}>Asfalt Kesme & Kırım İşleri</div></td>
                      <td style={{ padding: '10px 12px', color: '#455' }}>120 m²</td>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#20343a' }}>₺ 18.200</td>
                    </tr>
                    <tr style={{ background: '#fff5f2' }}>
                      <td style={{ padding: '10px 12px', color: '#a43e35' }}><strong>Deplase (Riskli)</strong><div style={{ fontSize: 10, color: '#a43e35', opacity: 0.8 }}>İGDAŞ 3 Bar Çelik Gaz Hattı Taşıma</div></td>
                      <td style={{ padding: '10px 12px', color: '#a43e35', fontWeight: 'bold' }}>45 mt</td>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#a43e35' }}>₺ 185.000</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ background: '#bd8537', color: '#fff', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 'bold' }}>TOPLAM TAHMİNİ BÜTÇE:</span>
                  <span style={{ fontSize: 20, fontWeight: '900', letterSpacing: 0.5 }}>₺ 267.700</span>
                </div>
              </div>
              <button className="btn" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}><Calculator size={14} style={{ marginRight: 6 }}/> Excel'e (BOQ) Aktar</button>
            </div>
          </div>
        )}
`;
  content = content.substring(0, panelsEndIndex) + newPanels + content.substring(panelsEndIndex);
}

fs.writeFileSync(appTsxPath, content);
console.log("Extreme Innovations added successfully.");

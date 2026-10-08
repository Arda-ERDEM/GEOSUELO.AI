import { useMemo, useState, type MouseEvent } from 'react';
import {
  Activity, AlertTriangle, ArrowDown, ChevronDown, CircleHelp,
  Crosshair, Droplet, Edit2, Layers2, LocateFixed, MapPin, Minus, Plus,
  Route, Search, ShieldAlert, ShieldCheck, Trash2, X,
} from 'lucide-react';

type Utility = 'water' | 'gas' | 'fiber' | 'electric' | 'sewer';
type MarkerType = 'manhole' | 'valve' | 'transformer' | 'hydrant';
type Marker = {
  id: string; name: string; lat: number; lon: number; type: MarkerType;
  utility: Utility; confidence: number; date: string;
};
type Asset = {
  id: string; utility: Utility; depth: number; confidence: number;
  risk: number; source: 'Tahmin' | 'Saha kaydı';
  start: [number, number]; end: [number, number];
};

const initialMarkers: Marker[] = [
  { id: 'm1', name: 'Moda rögar 04', lat: 40.98972, lon: 29.02861, type: 'manhole', utility: 'water', confidence: .91, date: '08 Eki 2026' },
  { id: 'm2', name: 'Bahariye vana', lat: 40.99134, lon: 29.0341, type: 'valve', utility: 'water', confidence: .84, date: '07 Eki 2026' },
  { id: 'm3', name: 'Rıhtım trafo 2', lat: 40.98796, lon: 29.02545, type: 'transformer', utility: 'electric', confidence: .78, date: '06 Eki 2026' },
  { id: 'm4', name: 'Caferağa yangın musluğu', lat: 40.99306, lon: 29.02902, type: 'hydrant', utility: 'water', confidence: .96, date: '05 Eki 2026' },
];
const assets: Asset[] = [
  { id: 'a1', utility: 'gas', depth: 1.2, confidence: .72, risk: 5, source: 'Tahmin', start: [40.99032, 29.02715], end: [40.99118, 29.03379] },
  { id: 'a2', utility: 'water', depth: 1.8, confidence: .88, risk: 2, source: 'Saha kaydı', start: [40.98692, 29.02712], end: [40.99212, 29.02782] },
  { id: 'a3', utility: 'fiber', depth: .65, confidence: .67, risk: 3, source: 'Tahmin', start: [40.9881, 29.0332], end: [40.99303, 29.0318] },
];
const nameOf = (value: string) => ({
  water: 'Su', gas: 'Doğal gaz', fiber: 'Fiber', electric: 'Elektrik', sewer: 'Kanalizasyon',
  manhole: 'Rögar', valve: 'Vana', transformer: 'Trafo', hydrant: 'Yangın musluğu',
}[value] ?? value);
const utilityTypes: Utility[] = ['water', 'gas', 'fiber', 'electric', 'sewer'];
const markerTypes: MarkerType[] = ['manhole', 'valve', 'transformer', 'hydrant'];

export function Simplified() {
  const [markers, setMarkers] = useState(initialMarkers);
  const [selectedMarker, setSelectedMarker] = useState('m1');
  const [activeTool, setActiveTool] = useState<'route' | 'zone' | 'nearby'>('route');
  const [markersOpen, setMarkersOpen] = useState(false);
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [routeReady, setRouteReady] = useState(false);
  const [zoneSelected, setZoneSelected] = useState(true);
  const [zoneDrawing, setZoneDrawing] = useState(false);
  const [zonePoints, setZonePoints] = useState<string[]>([]);
  const [zoneAnalyzed, setZoneAnalyzed] = useState(false);
  const [zoneName, setZoneName] = useState('Moda sokak yenileme · Bölüm 04');
  const [zoneCount, setZoneCount] = useState(1);
  const [radius, setRadius] = useState('1200');
  const [searchLat, setSearchLat] = useState('40.990000');
  const [searchLon, setSearchLon] = useState('29.030000');
  const [nearbySearched, setNearbySearched] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const [dialog, setDialog] = useState<Marker | 'new' | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<MarkerType>('manhole');
  const [formUtility, setFormUtility] = useState<Utility>('water');
  const [toast, setToast] = useState('');
  const [zoom, setZoom] = useState(15);

  const compatible = useMemo(() => {
    const origin = markers.find((marker) => marker.id === routeFrom);
    return origin ? markers.filter((marker) => marker.id !== origin.id && marker.utility === origin.utility) : markers;
  }, [markers, routeFrom]);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };
  const openMarkerForm = (marker?: Marker) => {
    setFormName(marker?.name ?? '');
    setFormType(marker?.type ?? 'manhole');
    setFormUtility(marker?.utility ?? 'water');
    setDialog(marker ?? 'new');
  };
  const saveMarker = () => {
    if (!formName.trim()) return;
    if (dialog && dialog !== 'new') {
      setMarkers((items) => items.map((item) => item.id === dialog.id
        ? { ...item, name: formName.trim(), type: formType, utility: formUtility }
        : item));
      notify('Yüzey işareti güncellendi');
    } else {
      const marker: Marker = {
        id: `m${Date.now()}`, name: formName.trim(), lat: 40.99, lon: 29.03,
        type: formType, utility: formUtility, confidence: .75, date: 'Bugün',
      };
      setMarkers((items) => [marker, ...items]);
      setSelectedMarker(marker.id);
      notify('Yüzey işareti kaydedildi');
    }
    setDialog(null);
  };
  const point = (lat: number, lon: number) => ({
    x: 470 + (lon - 29.03) * 30000,
    y: 270 - (lat - 40.99) * 30000,
  });
  const addZonePoint = (event: MouseEvent<SVGSVGElement>) => {
    if (!zoneDrawing) return;
    const cursor = event.currentTarget.createSVGPoint();
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const mapPoint = cursor.matrixTransform(matrix.inverse());
    const x = Math.round(Math.max(0, Math.min(900, mapPoint.x)));
    const y = Math.round(Math.max(0, Math.min(540, mapPoint.y)));
    setZonePoints((points) => [...points, `${x},${y}`]);
  };
  const finishZoneDrawing = () => {
    if (zonePoints.length < 3) {
      notify('Bölge için haritada en az 3 köşe seçin');
      return;
    }
    setZoneDrawing(false);
    setZoneSelected(true);
    setZoneName('Çizilen çalışma alanı');
    setZoneCount((count) => count + 1);
    setZoneAnalyzed(false);
    notify('Çalışma bölgesi yerel örnek olarak kaydedildi');
  };

  return (
    <div className="ag-simple">
      <style>{styles}</style>
      <header className="ag-topbar">
        <div className="ag-brand">
          <div className="ag-brand-mark"><Layers2 size={20} strokeWidth={2.1} /></div>
          <div><strong>AntiGravity</strong><span>SAHA HARİTASI <i /></span></div>
        </div>
        <div className="ag-top-meta">
          <span className="ag-system"><i /> Sistem hazır</span>
          <span className="ag-coordinates">KADIKÖY · 40.990° N / 29.030° E</span>
          <div className="ag-avatar">SA</div>
        </div>
      </header>

      <main className="ag-main">
        <div className="ag-heading">
          <div>
            <div className="ag-overline"><span>İSTANBUL</span><span className="ag-slash">/</span><span>KADIKÖY SAHA OPERASYONU</span></div>
            <h1>Kazı öncesi saha görünümü</h1>
            <p>Yüzey bulgularını ve olası yeraltı hatlarını tek haritada inceleyin.</p>
          </div>
          <button className="ag-button ag-button-dark" onClick={() => openMarkerForm()}>
            <Plus size={16} /> Yüzey işareti ekle
          </button>
        </div>

        <div className="ag-workspace">
          <section className="ag-map-card" aria-label="Kadıköy saha haritası">
            <div className="ag-map-top">
              <div className="ag-map-place"><span className="ag-map-pin"><MapPin size={17} /></span><div><strong>Kadıköy</strong><span>İstanbul · saha çalışma alanı</span></div></div>
              <div className="ag-map-tools">
                <span className="ag-map-scale">ZOOM <b>{zoom}</b></span>
                <button aria-label="Yakınlaştır" onClick={() => setZoom((z) => Math.min(19, z + 1))}><Plus size={15} /></button>
                <button aria-label="Uzaklaştır" onClick={() => setZoom((z) => Math.max(10, z - 1))}><Minus size={15} /></button>
                <button aria-label="Haritayı ortala" onClick={() => { setSearchLat('40.990000'); setSearchLon('29.030000'); setZoom(15); notify('Harita saha merkezine alındı'); }}><LocateFixed size={15} /></button>
              </div>
            </div>
            <div className="ag-map">
              <svg viewBox="0 0 900 540" preserveAspectRatio="xMidYMid slice" role="img" aria-label={zoneDrawing ? `Kadıköy haritası. Bölge çizimi açık, ${zonePoints.length} köşe seçildi. Köşe eklemek için haritayı seçin.` : 'Kadıköy sokakları, yüzey işaretleri, tahmini altyapı hatları ve kayıtlı kazı bölgesi'} onClick={addZonePoint} className={zoneDrawing ? 'ag-map-drawing' : undefined}>
                <defs>
                  <pattern id="ag-map-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M20 0H0V20" fill="none" stroke="#c6d0be" strokeWidth=".7" opacity=".43" />
                  </pattern>
                  <pattern id="ag-zone-pattern" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="10" height="10" fill="#e4a238" fillOpacity=".12" />
                    <path d="M0 0V10" stroke="#c77d1e" strokeWidth="1.3" opacity=".25" />
                  </pattern>
                  <filter id="ag-pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#263b33" floodOpacity=".25" />
                  </filter>
                </defs>
                <rect width="900" height="540" fill="#e9eddf" />
                <path d="M0 438 C130 410 226 466 339 437S575 410 900 444V540H0Z" fill="#c9dbd5" />
                <path d="M0 438 C130 410 226 466 339 437S575 410 900 444" fill="none" stroke="#a9c4bb" strokeWidth="2" />
                <rect width="900" height="540" fill="url(#ag-map-grid)" />
                <g fill="#d8e1d2" stroke="#c1cebf" strokeWidth="1.2">
                  <path d="M52 28h188v95H52zM268 25h190v90H268zM495 30h148v100H495zM686 20h172v105H686z" />
                  <path d="M28 176h152v112H28zM220 165h185v115H220zM449 166h196v114H449zM686 157h186v122H686z" />
                  <path d="M64 321h164v91H64zM267 315h184v102H267zM488 311h173v102H488zM696 316h168v103H696z" />
                </g>
                <g fill="none" stroke="#f8f8ef" strokeWidth="20" strokeLinecap="round">
                  <path d="M-15 147L915 126M-20 300L920 283M-20 420L920 395M175 -20L212 455M425 -20L446 455M665 -20L678 455M820 -20L800 455" />
                  <path d="M18 359L336 65M266 452L745 20M454 455L873 180" />
                </g>
                <g fill="none" stroke="#bec9bc" strokeWidth="1.2">
                  <path d="M-15 147L915 126M-20 300L920 283M-20 420L920 395M175 -20L212 455M425 -20L446 455M665 -20L678 455M820 -20L800 455" />
                  <path d="M18 359L336 65M266 452L745 20M454 455L873 180" />
                </g>
                <g fontFamily="ui-monospace, monospace" fontSize="11" fill="#76877c" letterSpacing="1">
                  <text x="355" y="136" transform="rotate(-1 355 136)">BAHARİYE CADDESİ</text>
                  <text x="360" y="291" transform="rotate(-1 360 291)">MODA CADDESİ</text>
                  <text x="354" y="411" transform="rotate(-1 354 411)">RIHTIM CADDESİ</text>
                  <text x="670" y="235" transform="rotate(-88 670 235)">GENERAL ASIM GÜNDÜZ CD.</text>
                  <text x="76" y="400" fontSize="10">MARMARA DENİZİ</text>
                </g>
                <text x="755" y="363" fontFamily="ui-sans-serif, sans-serif" fontSize="22" fontWeight="800" fill="#a1b8ad" letterSpacing="3">KADIKÖY</text>
                <polygon points="300,120 530,105 570,255 415,325 275,245" fill="url(#ag-zone-pattern)" stroke="#bd781c" strokeWidth="2.3" strokeDasharray="8 5" />
                {zonePoints.length > 0 && <g pointerEvents="none">
                  <polyline points={zonePoints.join(' ')} fill={zonePoints.length >= 3 ? '#e4a2382e' : 'none'} stroke="#286e5d" strokeWidth="3" strokeDasharray="7 5" />
                  {zonePoints.map((pointValue, index) => {
                    const [x, y] = pointValue.split(',');
                    return <circle key={`${pointValue}-${index}`} cx={x} cy={y} r="5" fill="#fbfaf2" stroke="#286e5d" strokeWidth="3" />;
                  })}
                </g>}
                <g transform="translate(308 145)">
                  <rect width="116" height="24" rx="5" fill="#fbf7eb" stroke="#d9b775" />
                  <path d="M10 8v9m-4-4.5h8" stroke="#a96916" strokeWidth="1.5" />
                  <text x="23" y="16" fontFamily="ui-sans-serif, sans-serif" fontSize="10" fontWeight="700" fill="#805516">KAZI BÖLGESİ</text>
                </g>
                {assets.map((asset) => {
                  const start = point(asset.start[0], asset.start[1]);
                  const end = point(asset.end[0], asset.end[1]);
                  const color = asset.source === 'Tahmin' ? '#c6533e' : '#348276';
                  const midX = (start.x + end.x) / 2;
                  const midY = (start.y + end.y) / 2;
                  return <g key={asset.id}>
                    <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#f9f2e8" strokeWidth="8" strokeLinecap="round" opacity=".82" />
                    <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={asset.id === 'a1' ? 4 : 3} strokeDasharray={asset.source === 'Tahmin' ? '9 7' : undefined} strokeLinecap="round" />
                    <circle cx={midX} cy={midY} r="8" fill="#fcfaf3" stroke={color} strokeWidth="2" />
                    {asset.id === 'a1' && <g transform={`translate(${midX + 13} ${midY - 27})`}>
                      <rect width="108" height="24" rx="5" fill="#fffaf2" stroke="#d8b8a8" />
                      <circle cx="10" cy="12" r="3" fill={color} />
                      <text x="19" y="16" fontFamily="ui-sans-serif, sans-serif" fontSize="10" fontWeight="700" fill="#6d4339">GAZ · 1,2 m</text>
                    </g>}
                  </g>;
                })}
                {markers.map((marker) => {
                  const { x, y } = point(marker.lat, marker.lon);
                  const active = selectedMarker === marker.id;
                  const labelWidth = Math.min(142, Math.max(83, marker.name.length * 6.1 + 14));
                  const labelX = x > 710 ? x - labelWidth - 17 : x + 16;
                  return <g key={marker.id} onClick={(event) => { event.stopPropagation(); setSelectedMarker(marker.id); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedMarker(marker.id); }} tabIndex={0} role="button" aria-label={`${marker.name}, ${nameOf(marker.utility)}`} style={{ cursor: 'pointer' }} filter="url(#ag-pin-shadow)">
                    {active && <circle cx={x} cy={y - 2} r="20" fill="#287469" fillOpacity=".16" />}
                    <path d={`M${x} ${y + 11}c-5.5-7.5-12-13.2-12-21a12 12 0 1 1 24 0c0 7.8-6.5 13.5-12 21Z`} fill={active ? '#e5a93b' : '#f9fbf1'} stroke={active ? '#fff8e8' : '#247367'} strokeWidth="2.3" />
                    <circle cx={x} cy={y - 10} r="3.7" fill="#276e64" />
                    <rect x={labelX} y={y - 27} width={labelWidth} height="19" rx="4" fill={active ? '#173b36' : '#f7f8ef'} stroke={active ? '#173b36' : '#ccd6c9'} />
                    <text x={labelX + 7} y={y - 14} fontFamily="ui-sans-serif, sans-serif" fontSize="9.5" fontWeight="600" fill={active ? '#fff9e9' : '#4e6359'}>{marker.name}</text>
                  </g>;
                })}
                <g transform="translate(30 495)">
                  <path d="M0 13h72M0 9v8M72 9v8" stroke="#647b70" strokeWidth="1.6" />
                  <text x="0" y="7" fontFamily="ui-monospace, monospace" fontSize="9" fill="#596d63">250 m</text>
                </g>
              </svg>
              {routeReady && (() => {
                const from = markers.find((marker) => marker.id === routeFrom);
                const to = markers.find((marker) => marker.id === routeTo);
                if (!from || !to) return null;
                const start = point(from.lat, from.lon);
                const end = point(to.lat, to.lon);
                return <svg className="ag-route-overlay" viewBox="0 0 900 540" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#f8f5eb" strokeWidth="10" strokeLinecap="round" /><line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#d28b2f" strokeWidth="4" strokeDasharray="8 6" strokeLinecap="round" /></svg>;
              })()}
              {zoneDrawing && <div className="ag-draw-banner"><Crosshair size={15} /> Haritaya dokunarak köşe ekleyin <strong>{zonePoints.length}</strong><button onClick={() => { setZoneDrawing(false); setZonePoints([]); notify('Bölge çizimi iptal edildi'); }}>İptal</button></div>}
              <div className="ag-map-legend">
                <span><i className="ag-legend-marker" /> Yüzey işareti</span>
                <span><i className="ag-legend-line" /> Tahmini hat</span>
                <span><i className="ag-legend-zone" /> Kazı bölgesi</span>
              </div>
            </div>
            <div className="ag-map-caption">
              <span><span className="ag-caption-dot" /> {markers.length} yüzey işareti</span>
              <span><span className="ag-caption-line" /> {assets.length} haritalı hat</span>
              <span className="ag-map-note"><AlertTriangle size={14} /> Kesin konum için saha doğrulaması gerekir</span>
            </div>
          </section>

          <aside className="ag-rail">
            <section className="ag-risk-card">
              <div className="ag-risk-head">
                <div className="ag-section-icon ag-icon-alert"><ShieldAlert size={17} /></div>
                <div><div className="ag-section-overline">ÖNCE GÜVENLİK</div><h2>Öne çıkan hat riski</h2></div>
                <span className="ag-risk-pill">YÜKSEK</span>
              </div>
              <div className="ag-risk-main">
                <div className="ag-risk-title"><span className="ag-gas-mark"><Activity size={16} /></span><div><strong>Doğal gaz hattı</strong><small>Sentetik güzergâh tahmini</small></div></div>
                <div className="ag-risk-score"><b>5</b><span>/ 5</span></div>
              </div>
              <div className="ag-risk-meter"><i /></div>
              <div className="ag-risk-facts">
                <div><span>Derinlik</span><strong>1,2 m</strong></div>
                <div><span>Güven</span><strong>%72</strong></div>
                <div><span>Kaynak</span><strong><span className="ag-source-dot" /> Tahmin</strong></div>
              </div>
              <div className="ag-warning"><AlertTriangle size={15} /><p>Tahmini hatlar sentetiktir; GPR ile doğrulanmamıştır. Kazı öncesi sahada teyit edin.</p></div>
              <p className="ag-risk-disclaimer">Risk puanı sezgiseldir; kaza olasılığı veya kayıp tahmini değildir.</p>
            </section>

            <section className="ag-tools-card" aria-label="Saha araçları">
              <div className="ag-tools-heading"><div><span>ÇALIŞMA ARAÇLARI</span><h2>İşlem seçin</h2></div><span className="ag-tools-location"><MapPin size={13} /> Kadıköy</span></div>
              <div className="ag-tool-tabs" role="tablist" aria-label="Saha aracı seçin">
                <button id="tool-tab-route" role="tab" aria-selected={activeTool === 'route'} aria-controls="tool-panel" className={activeTool === 'route' ? 'selected' : ''} onClick={() => { setActiveTool('route'); setZoneDrawing(false); }}><Route size={14} /><span>Hat tahmini</span></button>
                <button id="tool-tab-zone" role="tab" aria-selected={activeTool === 'zone'} aria-controls="tool-panel" className={activeTool === 'zone' ? 'selected' : ''} onClick={() => { setActiveTool('zone'); setZoneDrawing(false); }}><Crosshair size={14} /><span>Kazı bölgesi</span></button>
                <button id="tool-tab-nearby" role="tab" aria-selected={activeTool === 'nearby'} aria-controls="tool-panel" className={activeTool === 'nearby' ? 'selected' : ''} onClick={() => { setActiveTool('nearby'); setZoneDrawing(false); }}><Search size={14} /><span>Yakındakiler</span></button>
              </div>
              <div className="ag-tool-content" id="tool-panel" role="tabpanel" aria-labelledby={`tool-tab-${activeTool}`}>
              {activeTool === 'route' && <>
              <div className="ag-tool-intro"><div className="ag-section-icon ag-icon-route"><Route size={17} /></div><div><h2>Yüzeyden yüzeye güzergâh</h2><p>Aynı altyapı türündeki iki işareti eşleştirin.</p></div></div>
              <div className="ag-route-fields">
                <label>BAŞLANGIÇ
                  <select value={routeFrom} onChange={(event) => { setRouteFrom(event.target.value); setRouteTo(''); setRouteReady(false); }}>
                    <option value="">Yüzey işareti seçin</option>
                    {markers.map((marker) => <option value={marker.id} key={marker.id}>{marker.name} · {nameOf(marker.utility)}</option>)}
                  </select>
                </label>
                <div className="ag-route-connector"><i /><ArrowDown size={14} /><i /></div>
                <label>BİTİŞ
                  <select value={routeTo} onChange={(event) => { setRouteTo(event.target.value); setRouteReady(false); }}>
                    <option value="">Yüzey işareti seçin</option>
                    {compatible.map((marker) => <option value={marker.id} key={marker.id}>{marker.name}</option>)}
                  </select>
                </label>
              </div>
              <button className="ag-button ag-button-dark ag-full" disabled={!routeFrom || !routeTo} onClick={() => { setRouteReady(true); notify('Hat tahmini haritaya eklendi'); }}>
                <Route size={15} /> Hat tahmin et
              </button>
              {routeReady && <div className="ag-inline-result"><ShieldCheck size={15} /><span>Güzergâh tahmini haritaya eklendi.<small>Bu sentetik hat saha ölçümü değildir.</small></span></div>}
              <div className="ag-micro-note">Tahmin edilen hatlar sentetiktir ve GPR ölçümü değildir.</div>
              </>}
              {activeTool === 'zone' && <>
              <div className="ag-tool-intro"><div className="ag-section-icon ag-icon-zone"><Crosshair size={17} /></div><div><h2>Kazı alanını incele</h2><p>Bir çalışma bölgesi seçin veya haritada çizin.</p></div><span className="ag-saved-tag">{zoneCount} KAYITLI</span></div>
              <div className="ag-zone-choice">
                <button className={`ag-zone-select ${zoneSelected ? 'selected' : ''}`} onClick={() => setZoneSelected((selected) => !selected)}>
                  <span className="ag-radio">{zoneSelected && <i />}</span><span><strong>{zoneName}</strong><small>Haritada taralı poligon</small></span><ChevronDown size={15} />
                </button>
              </div>
              <div className="ag-zone-actions">
                <button className="ag-button ag-button-dark" disabled={!zoneSelected} onClick={() => { setZoneAnalyzed(true); notify('Kazı bölgesi incelemesi tamamlandı'); }}><ShieldCheck size={15} /> Çakışmaları incele</button>
                {zoneDrawing
                  ? <button className="ag-button ag-button-quiet active" onClick={finishZoneDrawing}><Crosshair size={15} /> Bitir · {zonePoints.length} köşe</button>
                  : <button className="ag-button ag-button-quiet" onClick={() => { setZonePoints([]); setZoneDrawing(true); setZoneAnalyzed(false); }}><Crosshair size={15} /> Bölge çiz</button>}
              </div>
              {zoneAnalyzed && <div className="ag-analysis-result"><div className="ag-analysis-score"><span>ORTA RİSK</span><strong>62<small>/100</small></strong></div><div><strong>2 olası çakışma</strong><small>Sentetik hat taraması · sezgisel değerlendirme</small></div></div>}
              <p className="ag-micro-note">Risk puanı sezgiseldir; kaza olasılığı veya kayıp tahmini değildir.</p>
              </>}
              {activeTool === 'nearby' && <>
              <div className="ag-tool-intro"><div className="ag-section-icon ag-icon-nearby"><Search size={17} /></div><div><h2>Yakındaki varlıkları bul</h2><p>Koordinat çevresinde yarıçap araması.</p></div></div>
              <div className="ag-coordinate-row">
                <label>ENLEM<input value={searchLat} onChange={(event) => setSearchLat(event.target.value)} /></label>
                <label>BOYLAM<input value={searchLon} onChange={(event) => setSearchLon(event.target.value)} /></label>
              </div>
              <div className="ag-radius-row">
                <label>YARIÇAP · METRE<input type="number" min="1" max="5000" value={radius} onChange={(event) => setRadius(event.target.value)} /></label>
                <button className="ag-button ag-button-dark" onClick={() => { setNearbySearched(true); notify(`${radius || '0'} m yarıçapındaki varlıklar listelendi`); }}><Search size={15} /> Ara</button>
              </div>
              <div className="ag-nearby-list">
                {(nearbySearched ? assets.slice(0, 2) : assets).map((asset) => <div className="ag-nearby-row" key={asset.id}>
                  <div className={`ag-asset-mark ${asset.utility === 'gas' ? 'gas' : asset.utility === 'water' ? 'water' : 'fiber'}`}>{asset.utility === 'water' ? <Droplet size={13} /> : <Activity size={13} />}</div>
                  <div className="ag-nearby-info"><strong>{nameOf(asset.utility)} hattı</strong><small>{asset.depth} m · %{Math.round(asset.confidence * 100)} güven</small></div>
                  <span className={`ag-mini-risk ${asset.risk >= 4 ? 'high' : asset.risk >= 3 ? 'medium' : ''}`}>Risk {asset.risk}/5</span>
                </div>)}
              </div>
              </>}
              </div>
            </section>
          </aside>
        </div>

        <section className={`ag-records ${markersOpen ? 'expanded' : ''}`}>
          <button className="ag-disclosure-head" onClick={() => setMarkersOpen((open) => !open)} aria-expanded={markersOpen} aria-controls="marker-register">
            <span className="ag-disclosure-icon"><Crosshair size={16} /></span>
            <span className="ag-disclosure-copy"><strong>Yüzey işaretleri</strong><small>{markers.length} kayıt · Sahada gözlemlenen bulgular</small></span>
            <span className="ag-count">{markers.length} kayıt</span>
            <span className="ag-disclosure-open">{markersOpen ? 'Gizle' : 'Kayıtları göster'}<ChevronDown size={15} /></span>
          </button>
          {markersOpen && <div id="marker-register">
          <div className="ag-register-actions"><span>Yüzey gözlem güveni, yeraltı hattı konumunun doğruluğu değildir.</span><button className="ag-button ag-button-outline" onClick={() => openMarkerForm()}><Plus size={15} /> İşaret ekle</button></div>
          <div className="ag-table-scroll">
            <table className="ag-marker-table">
              <thead><tr><th>İŞARET</th><th>ALTYAPI</th><th>KOORDİNAT</th><th>GÖZLEM GÜVENİ</th><th>KAYIT</th><th aria-label="İşlemler" /></tr></thead>
              <tbody>{markers.map((marker) => <tr key={marker.id} className={selectedMarker === marker.id ? 'row-selected' : ''} onClick={() => setSelectedMarker(marker.id)}>
                <td><span className="ag-marker-icon"><MapPin size={15} /></span><span className="ag-marker-name"><strong>{marker.name}</strong><small>{nameOf(marker.type)}</small></span></td>
                <td><span className="ag-utility-chip">{nameOf(marker.utility)}</span></td>
                <td><span className="ag-table-coord">{marker.lat.toFixed(5)}, {marker.lon.toFixed(5)}</span></td>
                <td><div className="ag-confidence"><strong>%{Math.round(marker.confidence * 100)}</strong><span><i style={{ width: `${marker.confidence * 100}%` }} /></span></div></td>
                <td><span className="ag-date">{marker.date}</span></td>
                <td><div className="ag-row-actions">
                  <button aria-label={`${marker.name} düzenle`} title="Düzenle" onClick={(event) => { event.stopPropagation(); openMarkerForm(marker); }}><Edit2 size={14} /></button>
                  <button aria-label={`${marker.name} sil`} title="Sil" onClick={(event) => { event.stopPropagation(); setMarkers((items) => items.filter((item) => item.id !== marker.id)); if (selectedMarker === marker.id) setSelectedMarker(''); notify('Yüzey işareti silindi'); }}><Trash2 size={14} /></button>
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="ag-record-foot"><span><Activity size={14} /> Ortalama gözlem güveni: %87</span><span>Koordinatlar · WGS84</span></div>
          </div>}
        </section>

        <footer className="ag-support">
          <button className={`ag-api-toggle ${apiOpen ? 'open' : ''}`} onClick={() => setApiOpen((open) => !open)} aria-expanded={apiOpen} aria-controls="api-reference"><CircleHelp size={16} /> API hızlı başvuru <span>REST · /api</span><span className="ag-api-disclosure-label">{apiOpen ? 'Gizle' : 'Aç'}</span><ChevronDown size={15} /></button>
          {apiOpen && <div className="ag-api-content" id="api-reference">
            <div className="ag-api-intro">JSON varlık listesi ve GIS/BIM araçları için GeoJSON hat geometrisi. Koordinat sırası WGS84 / EPSG:4326 biçiminde [boylam, enlem] şeklindedir; BIM koordinat sistemine dönüştürün. Bu MVP'de AutoCAD/Revit eklentisi yoktur.</div>
            <div className="ag-api-block"><strong>UÇ NOKTALARI</strong><pre>{`GET  /api/v1/markers\nPOST /api/v1/predictions  { markerAId, markerBId }\nGET  /api/v1/assets?lat=40.99&lon=29.03&radius=50\nGET  /api/v1/assets.geojson?lat=40.99&lon=29.03&radius=50\nPOST /api/v1/zones/{id}/analyze`}</pre></div>
            <div className="ag-api-block"><strong>GEOJSON İSTEK ÖRNEĞİ</strong><pre>{`curl -H "Accept: application/geo+json" \\\n  "https://<API_HOST>/api/v1/assets.geojson?lat=40.99032&lon=29.02715&radius=50"`}</pre></div>
            <div className="ag-api-block"><strong>TEMSİLİ GEOJSON YANITI</strong><pre>{`{\n  "type": "FeatureCollection",\n  "features": [{\n    "type": "Feature",\n    "geometry": { "type": "LineString", "coordinates": [[29.02715, 40.99032], [29.02779, 40.99065]] },\n    "properties": { "utilityType": "gas", "depthMeters": 1.2, "confidence": 0.72, "dataSource": "ai_prediction", "riskLevel": 5 }\n  }]\n}`}</pre></div>
            <div className="ag-api-status">Sağlık durumu: hazır · Temsili örnek veri</div>
          </div>}
        </footer>
      </main>

      {dialog && <div className="ag-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
        <form className="ag-modal" onSubmit={(event) => { event.preventDefault(); saveMarker(); }}>
          <div className="ag-modal-head"><div><span>SAHA KAYDI</span><h2>{dialog === 'new' ? 'Yüzey işareti ekle' : 'İşareti düzenle'}</h2><p>Ekibin yüzeyde doğruladığı bulguyu kaydedin.</p></div><button type="button" aria-label="Kapat" onClick={() => setDialog(null)}><X size={18} /></button></div>
          <div className="ag-modal-body">
            <label>İŞARET ADI<input autoFocus value={formName} onChange={(event) => setFormName(event.target.value)} placeholder="Örn. Moda vana odası" required /></label>
            <div className="ag-modal-grid">
              <label>YÜZEY İŞARETİ TÜRÜ<select value={formType} onChange={(event) => setFormType(event.target.value as MarkerType)}>{markerTypes.map((value) => <option key={value} value={value}>{nameOf(value)}</option>)}</select></label>
              <label>ALTYAPI TÜRÜ<select value={formUtility} onChange={(event) => setFormUtility(event.target.value as Utility)}>{utilityTypes.map((value) => <option key={value} value={value}>{nameOf(value)}</option>)}</select></label>
            </div>
            <div className="ag-modal-local"><i /> Yerel örnek kayıt · Gerçek API'ye gönderilmez</div>
          </div>
          <div className="ag-modal-actions"><button type="button" className="ag-button ag-button-quiet" onClick={() => setDialog(null)}>İptal</button><button className="ag-button ag-button-dark" type="submit"><ShieldCheck size={15} /> Kaydet</button></div>
        </form>
      </div>}
      {toast && <div className="ag-toast" role="status"><ShieldCheck size={16} />{toast}</div>}
    </div>
  );
}

const styles = `
.ag-simple{--ink:#193b36;--muted:#71827b;--paper:#f3f4ec;--panel:#fffef8;--line:#dfe5d8;--forest:#174f46;--teal:#287b6c;--amber:#e3a83c;--coral:#c7543d;min-height:100dvh;background:var(--paper);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px;line-height:1.45;-webkit-font-smoothing:antialiased}
.ag-simple *{box-sizing:border-box}.ag-simple button,.ag-simple input,.ag-simple select{font:inherit}.ag-simple button{cursor:pointer}.ag-simple button:focus-visible,.ag-simple input:focus-visible,.ag-simple select:focus-visible,.ag-simple [tabindex]:focus-visible{outline:3px solid #e7b44c;outline-offset:2px}
.ag-topbar{height:66px;background:#f9faf3;border-bottom:1px solid #e1e6db;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(18px,4.4vw,70px);gap:18px}
.ag-brand{display:flex;align-items:center;gap:11px}.ag-brand-mark{width:36px;height:36px;background:#194e45;color:#e5b34f;border-radius:11px;display:grid;place-items:center;box-shadow:inset 0 0 0 1px #ffffff25}.ag-brand>div:last-child{display:grid;gap:2px}.ag-brand strong{font-size:16px;font-weight:760;letter-spacing:-.45px;color:#183b35}.ag-brand span{display:flex;align-items:center;gap:7px;font-size:9px;letter-spacing:1.35px;font-weight:750;color:#839089}.ag-brand span i{width:5px;height:5px;background:#62a783;border-radius:50%}
.ag-top-meta{display:flex;align-items:center;gap:22px}.ag-system{display:flex;align-items:center;gap:8px;color:#4b7160;font-size:11px;font-weight:700}.ag-system i{width:8px;height:8px;border-radius:50%;background:#58a276;box-shadow:0 0 0 3px #58a27622}.ag-coordinates{font:10px ui-monospace,SFMono-Regular,monospace;color:#7e8c84;letter-spacing:.5px}.ag-avatar{height:30px;width:30px;display:grid;place-items:center;border-radius:50%;background:#e3ebe0;color:#3d675b;font-size:10px;font-weight:800}
.ag-main{max-width:1480px;margin:0 auto;padding:28px clamp(18px,4.4vw,70px) 46px}.ag-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:21px}.ag-overline{display:flex;align-items:center;gap:9px;color:#71847b;font:700 10px ui-monospace,SFMono-Regular,monospace;letter-spacing:1.15px}.ag-slash{color:#d0a34b}.ag-heading h1{font-size:clamp(24px,3vw,32px);line-height:1.15;letter-spacing:-1.2px;margin:8px 0 5px;font-weight:760;color:#193d36}.ag-heading p{margin:0;color:#72827b;font-size:13px}.ag-button{height:39px;padding:0 14px;border-radius:8px;border:1px solid transparent;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:700;white-space:nowrap;transition:transform .18s ease,background .18s ease,border-color .18s ease,box-shadow .18s ease}.ag-button:hover:not(:disabled){transform:translateY(-1px)}.ag-button:disabled{opacity:.42;cursor:not-allowed}.ag-button-dark{background:#1b5147;color:#f7f6e9;box-shadow:0 2px 4px #153b3422}.ag-button-dark:hover:not(:disabled){background:#246658;box-shadow:0 4px 12px #153b3425}.ag-button-quiet{background:#f7f8f0;color:#45645b;border-color:#e0e6dc}.ag-button-quiet:hover:not(:disabled){background:#edf2e8}.ag-button-quiet.active{background:#f8ead1;border-color:#e6c17b;color:#77551f}.ag-button-outline{height:34px;background:#fffef9;border-color:#dce4d8;color:#355b4f;font-size:11px;padding:0 11px}.ag-button-outline:hover{background:#eff4eb}
.ag-workspace{display:grid;grid-template-columns:minmax(0,1fr) 358px;align-items:start;gap:16px}.ag-map-card,.ag-tool-card,.ag-risk-card,.ag-records{background:var(--panel);border:1px solid var(--line);border-radius:13px;box-shadow:0 3px 13px #233f3210}.ag-map-card{min-width:0;overflow:hidden}.ag-map-top{height:65px;padding:0 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e4e8df}.ag-map-place{display:flex;align-items:center;gap:11px}.ag-map-pin{height:34px;width:34px;border-radius:10px;background:#e9f0e6;color:#357366;display:grid;place-items:center}.ag-map-place div{display:grid;gap:2px}.ag-map-place strong{font-size:14px;color:#244a40}.ag-map-place div span{font-size:10px;color:#87948c}.ag-map-tools{display:flex;align-items:center;gap:5px}.ag-map-tools button{height:31px;width:32px;display:grid;place-items:center;background:#fbfcf6;color:#62786e;border:1px solid #e2e7dd;border-radius:7px;transition:background .16s,color .16s}.ag-map-tools button:hover{background:#e9f0e6;color:#205c50}.ag-map-scale{font:9px ui-monospace,SFMono-Regular,monospace;color:#87948a;margin-right:5px;letter-spacing:.7px}.ag-map-scale b{color:#526b5c;margin-left:4px}
.ag-map{height:492px;position:relative;overflow:hidden;background:#e9eddf}.ag-map>svg{width:100%;height:100%;display:block}.ag-map-legend{position:absolute;bottom:16px;left:16px;display:flex;flex-wrap:wrap;gap:15px;padding:10px 12px;background:#fbfcf3ed;backdrop-filter:blur(8px);border:1px solid #dce3d5;border-radius:9px;box-shadow:0 3px 12px #243d3215}.ag-map-legend span{display:flex;align-items:center;gap:7px;color:#536b5e;font-size:10px;font-weight:650}.ag-legend-marker{width:9px;height:9px;border-radius:50%;background:#287b6c;box-shadow:0 0 0 3px #287b6c20}.ag-legend-line{width:19px;border-top:2px dashed #c6533e}.ag-legend-zone{width:12px;height:10px;border:1px dashed #bd781c;background:#e4a23855}.ag-map-caption{height:44px;border-top:1px solid #e4e8df;display:flex;align-items:center;gap:21px;padding:0 17px;color:#718179;font-size:10px}.ag-map-caption>span{display:flex;align-items:center;gap:7px;white-space:nowrap}.ag-caption-dot{height:7px;width:7px;border-radius:50%;background:#287b6c}.ag-caption-line{width:16px;border-top:2px dashed #c6533e}.ag-map-caption .ag-map-note{margin-left:auto;color:#966239}.ag-map-note svg{color:#bd8534}.ag-draw-banner{position:absolute;top:13px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;background:#1c4a40;color:#f8f7e8;padding:10px 12px;border-radius:8px;box-shadow:0 5px 18px #1e3c3333;font-size:11px;white-space:nowrap}.ag-draw-banner button{border:0;border-left:1px solid #ffffff45;padding:0 0 0 10px;color:#f0c46c;background:none;font-size:11px;font-weight:700}
.ag-rail{display:flex;flex-direction:column;gap:12px;min-width:0}.ag-risk-card{padding:16px 17px 13px;border-top:3px solid #c95b42}.ag-risk-head{display:flex;align-items:center;gap:10px}.ag-section-icon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex:none}.ag-icon-alert{background:#f9e9df;color:#b94e3d}.ag-section-overline{font:750 9px ui-monospace,SFMono-Regular,monospace;color:#b55340;letter-spacing:1.05px}.ag-risk-head h2,.ag-card-heading h2,.ag-record-title h2{font-size:13px;letter-spacing:-.2px;margin:2px 0 0;color:#25473e;font-weight:750}.ag-risk-pill{margin-left:auto;border:1px solid #efd0c4;border-radius:99px;background:#fff3ed;padding:4px 8px;color:#b14c3c;font:800 9px ui-monospace,SFMono-Regular,monospace;letter-spacing:.6px}.ag-risk-main{display:flex;align-items:center;justify-content:space-between;margin:18px 0 10px}.ag-risk-title{display:flex;align-items:center;gap:9px}.ag-gas-mark{height:31px;width:31px;border-radius:9px;background:#fff2e9;color:#c2583f;display:grid;place-items:center}.ag-risk-title div{display:grid;gap:3px}.ag-risk-title strong{font-size:12px;color:#3c4940}.ag-risk-title small{font-size:9px;color:#8b9287}.ag-risk-score{display:flex;align-items:baseline;color:#b74e3e}.ag-risk-score b{font:750 25px/1 ui-sans-serif,system-ui;letter-spacing:-1.2px}.ag-risk-score span{font-size:11px;color:#a57b69;margin-left:3px}.ag-risk-meter{height:5px;border-radius:10px;background:#eee9dd;overflow:hidden}.ag-risk-meter i{display:block;width:100%;height:100%;background:linear-gradient(90deg,#e7b34d,#c8523d);border-radius:10px;transform-origin:left;animation:ag-grow .6s ease-out both}.ag-risk-facts{display:grid;grid-template-columns:.9fr .9fr 1.2fr;padding:13px 0 12px}.ag-risk-facts>div{display:grid;gap:4px;border-right:1px solid #e9e9df;padding-left:10px}.ag-risk-facts>div:first-child{padding-left:0}.ag-risk-facts>div:last-child{border-right:0}.ag-risk-facts span{font-size:9px;color:#859087}.ag-risk-facts strong{font-size:11px;color:#42594d;display:flex;align-items:center;gap:5px}.ag-source-dot{width:6px;height:6px;border-radius:50%;background:#c65a41}.ag-warning{display:flex;align-items:flex-start;gap:8px;padding:10px;background:#fff4e7;border:1px solid #f0dfc0;border-radius:8px;color:#95632b}.ag-warning svg{flex:none;margin-top:1px}.ag-warning p{font-size:10px;line-height:1.45;margin:0;color:#795628}.ag-risk-disclaimer{font-size:9px;color:#8e8b7d;margin:8px 0 0;line-height:1.4}
.ag-tool-card{padding:14px 15px}.ag-card-heading{display:flex;align-items:center;gap:9px;margin-bottom:12px}.ag-icon-route{background:#e8f0e7;color:#347568}.ag-icon-zone{background:#f7eedb;color:#9a7026}.ag-icon-nearby{background:#e7eff0;color:#4e7470}.ag-card-heading h2{font-size:12px;margin:0}.ag-card-heading p{font-size:9px;margin:3px 0 0;color:#849188}.ag-route-fields{display:flex;flex-direction:column;gap:5px}.ag-route-fields label,.ag-coordinate-row label,.ag-radius-row label{display:flex;flex-direction:column;gap:4px;color:#8b968d;font:750 8px ui-monospace,SFMono-Regular,monospace;letter-spacing:.65px}.ag-route-fields select,.ag-coordinate-row input,.ag-radius-row input,.ag-modal-body input,.ag-modal-body select{width:100%;height:34px;padding:0 9px;border-radius:7px;border:1px solid #dfe5db;background:#fbfcf6;color:#426056;font:500 10px ui-sans-serif,system-ui;outline:none}.ag-route-fields select:focus,.ag-coordinate-row input:focus,.ag-radius-row input:focus,.ag-modal-body input:focus,.ag-modal-body select:focus{border-color:#74a895;box-shadow:0 0 0 3px #4d927b1c}.ag-route-connector{height:13px;display:flex;align-items:center;gap:4px;margin-left:12px;color:#9bb1a3}.ag-route-connector i{height:1px;width:12px;background:#c5d5c8}.ag-full{width:100%;margin-top:10px;height:36px;font-size:11px}.ag-inline-result{display:flex;align-items:flex-start;gap:8px;margin-top:9px;padding:9px;border-radius:7px;background:#e9f2e9;color:#3c715d;font-size:10px}.ag-inline-result>svg{flex:none}.ag-inline-result span{font-weight:700}.ag-inline-result small{display:block;margin-top:2px;font-size:9px;color:#788a7e;font-weight:500}.ag-micro-note{font-size:9px;line-height:1.45;color:#869189;margin:9px 0 0}.ag-excavation .ag-card-heading{margin-bottom:9px}.ag-saved-tag{margin-left:auto;padding:4px 6px;border-radius:5px;background:#f6f0df;color:#9b762f;font:750 8px ui-monospace,SFMono-Regular,monospace;letter-spacing:.5px}.ag-zone-choice{margin-bottom:8px}.ag-zone-select{width:100%;display:flex;align-items:center;gap:8px;text-align:left;padding:8px 9px;background:#fbfcf6;border:1px solid #e2e7dc;border-radius:8px;color:#577167;transition:border-color .18s,background .18s}.ag-zone-select:hover,.ag-zone-select.selected{border-color:#c9d9c7;background:#f4f7ee}.ag-radio{height:14px;width:14px;border-radius:50%;border:1.5px solid #a9bbab;display:grid;place-items:center}.ag-zone-select.selected .ag-radio{border-color:#3c826c}.ag-radio i{height:6px;width:6px;background:#3c826c;border-radius:50%}.ag-zone-select>span:nth-child(2){display:grid;gap:2px;flex:1}.ag-zone-select strong{font-size:10px;color:#476459}.ag-zone-select small{font-size:9px;color:#89938a}.ag-zone-select>svg{transform:rotate(-90deg);color:#89938a}.ag-zone-actions{display:grid;grid-template-columns:1fr auto;gap:6px}.ag-zone-actions .ag-button{height:35px;font-size:10px;padding:0 9px}.ag-analysis-result{display:flex;align-items:center;gap:12px;margin-top:10px;padding:9px;background:#f8f1e2;border:1px solid #ede0bf;border-radius:8px}.ag-analysis-score{display:grid;gap:2px;padding-right:12px;border-right:1px solid #e6d8b9}.ag-analysis-score span{font:750 7px ui-monospace,SFMono-Regular,monospace;color:#8d6e32;letter-spacing:.5px}.ag-analysis-score strong{font-size:17px;line-height:1;color:#9b6c22}.ag-analysis-score small{font-size:9px;color:#a68c5e}.ag-analysis-result>div:last-child strong{display:block;font-size:9px;color:#705d38}.ag-analysis-result>div:last-child small{display:block;margin-top:3px;color:#96866a;font-size:8px}
.ag-coordinate-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ag-coordinate-row input,.ag-radius-row input{font:10px ui-monospace,SFMono-Regular,monospace;letter-spacing:-.3px}.ag-radius-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end;margin-top:8px}.ag-radius-row .ag-button{height:34px;padding:0 12px;font-size:10px}.ag-nearby-list{margin-top:7px;border-top:1px solid #edf0e8}.ag-nearby-row{display:flex;align-items:center;gap:8px;padding:8px 1px;border-bottom:1px solid #edf0e8}.ag-nearby-row:last-child{border-bottom:0;padding-bottom:1px}.ag-asset-mark{height:27px;width:27px;display:grid;place-items:center;border-radius:8px;flex:none}.ag-asset-mark.gas{background:#fff0e8;color:#c35b40}.ag-asset-mark.water{background:#e7f0ea;color:#397c6b}.ag-asset-mark.fiber{background:#e9eef3;color:#607d98}.ag-nearby-info{display:grid;gap:2px;flex:1}.ag-nearby-info strong{font-size:10px;color:#4c6358}.ag-nearby-info small{font:9px ui-monospace,SFMono-Regular,monospace;color:#89948b}.ag-mini-risk{border-radius:5px;padding:4px 6px;background:#edf3e9;color:#4d7960;font:750 8px ui-monospace,SFMono-Regular,monospace;white-space:nowrap}.ag-mini-risk.medium{background:#f6f0dd;color:#98722e}.ag-mini-risk.high{background:#fae9e2;color:#ae4a39}
.ag-records{margin-top:16px;overflow:hidden}.ag-record-header{min-height:67px;padding:0 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e7ebe2}.ag-record-title{display:flex;align-items:center;gap:10px}.ag-icon-record{background:#e8f0e7;color:#347568}.ag-record-title h2{font-size:13px;margin:0}.ag-record-title p{font-size:9px;color:#89958c;margin:3px 0 0}.ag-count{margin-left:5px;padding:4px 7px;background:#eff3e9;border-radius:5px;color:#5f796a;font:750 9px ui-monospace,SFMono-Regular,monospace}.ag-table-scroll{overflow:auto}.ag-marker-table{width:100%;border-collapse:collapse;min-width:690px}.ag-marker-table th{height:35px;background:#fafbf6;text-align:left;padding:0 14px;color:#89958c;font:750 8px ui-monospace,SFMono-Regular,monospace;letter-spacing:.8px;border-bottom:1px solid #e9ede5}.ag-marker-table th:first-child,.ag-marker-table td:first-child{padding-left:18px}.ag-marker-table td{height:57px;padding:6px 14px;border-bottom:1px solid #eef0e9;color:#53695e;font-size:10px}.ag-marker-table tbody tr{cursor:pointer;transition:background .18s}.ag-marker-table tbody tr:hover td,.ag-marker-table tbody tr.row-selected td{background:#f8faf2}.ag-marker-table tbody tr:last-child td{border-bottom:0}.ag-marker-table td:first-child{display:flex;align-items:center;gap:9px}.ag-marker-icon{height:28px;width:28px;border-radius:8px;background:#edf3e9;color:#438173;display:grid;place-items:center;flex:none}.ag-marker-name{display:grid;gap:2px}.ag-marker-name strong{font-size:10px;color:#3f594e;font-weight:700}.ag-marker-name small{color:#89948b;font-size:9px}.ag-utility-chip{display:inline-flex;padding:4px 7px;border-radius:5px;background:#edf3e9;color:#4f7566;font-size:9px;font-weight:700}.ag-table-coord{font:9px ui-monospace,SFMono-Regular,monospace;color:#73847a}.ag-confidence{display:flex;align-items:center;gap:8px}.ag-confidence strong{min-width:25px;font:700 9px ui-monospace,SFMono-Regular,monospace;color:#4c695c}.ag-confidence>span{height:4px;width:39px;border-radius:5px;background:#e6ebe0;overflow:hidden}.ag-confidence>span i{height:100%;display:block;border-radius:5px;background:#4b8e74}.ag-date{font:9px ui-monospace,SFMono-Regular,monospace;color:#859087}.ag-row-actions{display:flex;justify-content:flex-end;gap:4px}.ag-row-actions button{height:27px;width:27px;display:grid;place-items:center;border:0;border-radius:6px;background:transparent;color:#84928a;transition:background .16s,color .16s}.ag-row-actions button:hover{background:#eaf0e6;color:#2d6658}.ag-record-foot{min-height:35px;padding:0 18px;background:#fafbf6;border-top:1px solid #e9ede5;display:flex;align-items:center;justify-content:space-between;gap:10px;color:#879188;font-size:9px}.ag-record-foot>span:first-child{display:flex;align-items:center;gap:6px}.ag-record-foot svg{color:#77907f}.ag-record-foot>span:last-child{font:9px ui-monospace,SFMono-Regular,monospace}
.ag-support{margin-top:13px;border:1px solid #dfe5d8;border-radius:11px;background:#f9faf3;display:grid;grid-template-columns:1fr 1.2fr auto;align-items:center;padding:12px 15px;gap:15px}.ag-support-confidence{display:flex;align-items:center;gap:9px}.ag-confidence-icon{height:31px;width:31px;display:grid;place-items:center;border-radius:9px;background:#e7f0e7;color:#397869}.ag-support-confidence strong{display:block;color:#3c6958;font-size:12px}.ag-support-confidence strong span{font-size:10px;font-weight:650;color:#63796d}.ag-support-confidence small{display:block;font-size:9px;color:#89948c;margin-top:2px}.ag-support-note{display:flex;align-items:center;gap:8px;color:#74847a;font-size:10px}.ag-support-note svg{color:#5d8a71;flex:none}.ag-api-toggle{height:34px;display:flex;align-items:center;gap:7px;padding:0 10px;background:transparent;border:1px solid #e0e6dc;border-radius:7px;color:#47665a;font-size:10px;font-weight:700;white-space:nowrap;transition:background .18s}.ag-api-toggle:hover,.ag-api-toggle.open{background:#edf3e9}.ag-api-toggle span{color:#909a91;font:8px ui-monospace,SFMono-Regular,monospace;font-weight:500}.ag-api-toggle>svg:last-child{transition:transform .2s}.ag-api-toggle.open>svg:last-child{transform:rotate(180deg)}.ag-api-content{grid-column:1/-1;border-top:1px solid #e8ece3;padding:13px 2px 2px;display:grid;grid-template-columns:1fr 1fr;gap:12px}.ag-api-intro{grid-column:1/-1;font-size:10px;color:#718078;line-height:1.55}.ag-api-block strong{font:750 8px ui-monospace,SFMono-Regular,monospace;letter-spacing:.7px;color:#708176}.ag-api-block pre{margin:6px 0 0;padding:10px;border-radius:7px;background:#eef2e9;color:#4c6659;white-space:pre-wrap;overflow:auto;font:9px/1.7 ui-monospace,SFMono-Regular,monospace}.ag-api-status{grid-column:1/-1;color:#819087;font-size:9px}
.ag-modal-backdrop{position:fixed;inset:0;z-index:30;background:#102e2ab3;backdrop-filter:blur(4px);display:grid;place-items:center;padding:18px;animation:ag-fade .18s ease-out}.ag-modal{width:min(470px,100%);background:#fbfcf5;border:1px solid #dfe6d8;border-radius:14px;box-shadow:0 24px 70px #112b2780;overflow:hidden;animation:ag-rise .22s ease-out}.ag-modal-head{display:flex;justify-content:space-between;padding:20px 21px 16px;border-bottom:1px solid #e6ebe1}.ag-modal-head>div>span{font:750 9px ui-monospace,SFMono-Regular,monospace;letter-spacing:1px;color:#7b8b7f}.ag-modal-head h2{margin:5px 0 4px;font-size:18px;letter-spacing:-.5px;color:#1b4339}.ag-modal-head p{margin:0;color:#859188;font-size:11px}.ag-modal-head>button{height:29px;width:29px;border:0;border-radius:7px;background:#f0f3eb;color:#72847a;display:grid;place-items:center}.ag-modal-body{padding:18px 21px 20px;display:grid;gap:14px}.ag-modal-body label{display:grid;gap:6px;color:#7f8d83;font:750 9px ui-monospace,SFMono-Regular,monospace;letter-spacing:.7px}.ag-modal-body input,.ag-modal-body select{height:38px;font-size:11px}.ag-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ag-modal-local{display:flex;align-items:center;gap:7px;color:#89948b;font-size:9px}.ag-modal-local i{height:6px;width:6px;border-radius:50%;background:#daa847}.ag-modal-actions{display:flex;justify-content:flex-end;gap:8px;padding:12px 21px;border-top:1px solid #e6ebe1}.ag-modal-actions .ag-button{height:35px}.ag-toast{position:fixed;z-index:40;bottom:22px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:9px;padding:11px 15px;background:#194f45;color:#f5f5e8;border:1px solid #ffffff20;border-radius:9px;box-shadow:0 8px 24px #1c423b40;font-size:11px;font-weight:650;animation:ag-rise .2s ease-out;white-space:nowrap}.ag-toast svg{color:#e5b44c}
@keyframes ag-grow{from{transform:scaleX(.2)}to{transform:scaleX(1)}}@keyframes ag-fade{from{opacity:0}to{opacity:1}}@keyframes ag-rise{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
@media(min-width:1200px){.ag-map{height:540px}.ag-rail{gap:13px}.ag-risk-card{padding:17px 18px 14px}.ag-tool-card{padding:15px 16px}}
@media(max-width:1050px){.ag-workspace{grid-template-columns:minmax(0,1fr) 320px}.ag-main{padding-left:24px;padding-right:24px}.ag-map{height:470px}.ag-map-caption{gap:12px}.ag-map-caption .ag-map-note{font-size:9px}}
@media(max-width:850px){.ag-workspace{grid-template-columns:1fr}.ag-map{height:min(58vw,470px);min-height:360px}.ag-rail{display:grid;grid-template-columns:1fr 1fr;align-items:start}.ag-risk-card,.ag-nearby{grid-column:span 2}.ag-support{grid-template-columns:1fr 1fr}.ag-api-toggle{justify-self:end}.ag-support-note{grid-column:1/-1;grid-row:2}.ag-api-toggle{grid-column:2;grid-row:1}}
@media(max-width:590px){.ag-topbar{height:58px;padding:0 15px}.ag-top-meta{gap:11px}.ag-coordinates{display:none}.ag-main{padding:21px 13px 30px}.ag-heading{align-items:flex-start;flex-direction:column;gap:13px;margin-bottom:16px}.ag-heading h1{font-size:25px}.ag-heading p{max-width:330px;font-size:12px}.ag-heading>.ag-button{height:36px}.ag-workspace{gap:11px}.ag-map-top{height:58px;padding:0 11px}.ag-map-place{gap:8px}.ag-map-place div span{font-size:9px}.ag-map-tools{gap:3px}.ag-map-scale{display:none}.ag-map-tools button{width:29px;height:29px}.ag-map{height:390px;min-height:390px}.ag-map-legend{bottom:11px;left:9px;right:9px;gap:10px;padding:8px 9px;justify-content:center}.ag-map-legend span{font-size:9px;gap:6px}.ag-map-caption{height:auto;min-height:42px;display:grid;grid-template-columns:auto auto;gap:7px 12px;padding:9px 11px}.ag-map-caption .ag-map-note{margin:0;grid-column:1/-1;font-size:9px}.ag-rail{display:flex;gap:10px}.ag-risk-card,.ag-tool-card{padding:13px}.ag-risk-facts{padding:12px 0 10px}.ag-record-header{padding:10px 12px;min-height:60px}.ag-record-title{gap:8px}.ag-record-title p{max-width:205px}.ag-count{font-size:8px;margin-left:0}.ag-record-header>.ag-button{padding:0 9px;font-size:10px}.ag-marker-table th:first-child,.ag-marker-table td:first-child{padding-left:12px}.ag-marker-table th,.ag-marker-table td{padding-left:9px;padding-right:9px}.ag-record-foot{padding:8px 12px;align-items:flex-start;flex-direction:column;gap:4px}.ag-support{grid-template-columns:1fr;gap:11px;padding:12px}.ag-support-note,.ag-api-toggle{grid-column:1;grid-row:auto;justify-self:stretch}.ag-api-toggle{justify-content:flex-start}.ag-api-toggle>svg:last-child{margin-left:auto}.ag-api-content{grid-template-columns:1fr}.ag-api-intro,.ag-api-status{grid-column:1}.ag-modal-grid{grid-template-columns:1fr}.ag-modal-head,.ag-modal-body{padding-left:16px;padding-right:16px}.ag-modal-actions{padding-left:16px;padding-right:16px}}
@media(prefers-reduced-motion:reduce){.ag-simple *,.ag-simple *::before,.ag-simple *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}
.ag-workspace{grid-template-columns:minmax(0,1.7fr) minmax(340px,.82fr);gap:15px}
.ag-map{height:550px}.ag-rail{gap:11px}
.ag-risk-card{padding:16px 17px 14px}.ag-risk-main{margin:13px 0 9px}.ag-risk-facts{padding:11px 0}.ag-warning{padding:9px}.ag-risk-disclaimer{margin-top:7px}
.ag-tools-card{background:var(--panel);border:1px solid var(--line);border-radius:13px;box-shadow:0 3px 13px #233f3210;overflow:hidden}
.ag-tools-heading{height:58px;padding:0 15px;display:flex;align-items:center;justify-content:space-between}
.ag-tools-heading>div>span{font:750 8px ui-monospace,SFMono-Regular,monospace;letter-spacing:1px;color:#829187}.ag-tools-heading h2{margin:3px 0 0;font-size:13px;letter-spacing:-.2px;color:#294a3f}
.ag-tools-location{display:flex;align-items:center;gap:5px;color:#7f8d83;font-size:9px}.ag-tools-location svg{color:#548475}
.ag-tool-tabs{padding:0 10px 10px;display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.ag-tool-tabs button{height:36px;min-width:0;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid #e3e8dd;border-radius:7px;background:#fafbf6;color:#76867d;font-size:9px;font-weight:700;transition:background .17s,border-color .17s,color .17s}
.ag-tool-tabs button:hover{background:#f0f4eb;color:#426d5d}.ag-tool-tabs button.selected{background:#1c5248;border-color:#1c5248;color:#f9f7e9;box-shadow:0 2px 5px #20463a20}
.ag-tool-tabs button svg{flex:none}.ag-tool-content{min-height:261px;border-top:1px solid #e9ede5;padding:14px 15px 13px;animation:ag-tool-in .2s ease-out}
.ag-tool-intro{display:flex;align-items:center;gap:9px;margin:0 0 12px}.ag-tool-intro h2{font-size:12px;color:#315247;margin:0;font-weight:740}.ag-tool-intro p{font-size:9px;color:#849087;margin:3px 0 0}.ag-tool-intro .ag-saved-tag{margin-left:auto}
.ag-tool-content .ag-route-fields{gap:5px}.ag-tool-content .ag-route-fields select{height:33px}.ag-tool-content .ag-route-connector{height:10px}.ag-tool-content .ag-full{margin-top:9px;height:35px}.ag-tool-content .ag-zone-choice{margin-bottom:9px}.ag-tool-content .ag-zone-actions{grid-template-columns:1fr 1fr}.ag-tool-content .ag-zone-actions .ag-button{height:36px;font-size:9px;padding:0 7px}.ag-tool-content .ag-nearby-list{margin-top:6px}.ag-tool-content .ag-nearby-row{padding:6px 1px}.ag-tool-content .ag-nearby-row:last-child{padding-bottom:1px}.ag-tool-content .ag-coordinate-row input,.ag-tool-content .ag-radius-row input{height:32px}.ag-tool-content .ag-radius-row{margin-top:7px}.ag-tool-content .ag-micro-note{margin-top:8px}
.ag-map-drawing{cursor:crosshair}.ag-route-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.ag-draw-banner{max-width:calc(100% - 24px);padding:8px 10px}.ag-draw-banner strong{min-width:19px;height:19px;display:grid;place-items:center;border-radius:50%;background:#ffffff20;color:#f0c46c;font-size:10px}
.ag-records{margin-top:12px;border-radius:10px}.ag-disclosure-head{width:100%;min-height:61px;display:flex;align-items:center;gap:11px;text-align:left;padding:9px 15px;border:0;background:#fffef8;color:#294b40;transition:background .18s}.ag-disclosure-head:hover{background:#fafbf5}.ag-disclosure-icon{height:32px;width:32px;display:grid;place-items:center;background:#e9f0e6;border-radius:9px;color:#39796a;flex:none}.ag-disclosure-copy{display:grid;gap:2px;flex:1}.ag-disclosure-copy strong{font-size:12px;font-weight:750}.ag-disclosure-copy small{font-size:9px;color:#849087}.ag-disclosure-open{display:flex;align-items:center;gap:6px;color:#60796d;font-size:10px;font-weight:700;white-space:nowrap}.ag-disclosure-open svg{transition:transform .2s}.ag-records.expanded .ag-disclosure-open svg{transform:rotate(180deg)}.ag-register-actions{padding:8px 15px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fafbf6;border-top:1px solid #e9ede5;color:#849087;font-size:9px}.ag-register-actions .ag-button{height:30px;font-size:10px}.ag-record-foot{padding:0 15px}.ag-count{white-space:nowrap}
.ag-support{display:block;margin:10px 0 0;padding:0;border:0;background:transparent;box-shadow:none}.ag-api-toggle{width:100%;height:43px;justify-content:flex-start;padding:0 14px;background:#f9faf4;border:1px solid #dfe5d8;border-radius:9px;font-size:10px}.ag-api-toggle:hover,.ag-api-toggle.open{background:#f0f4eb}.ag-api-toggle>svg:first-child{color:#4e7a68}.ag-api-toggle .ag-api-disclosure-label{margin-left:auto;color:#6a8074;font:700 9px ui-sans-serif,system-ui}.ag-api-toggle>svg:last-child{transition:transform .2s}.ag-api-toggle.open>svg:last-child{transform:rotate(180deg)}.ag-api-content{margin-top:8px;padding:14px;border:1px solid #dfe5d8;border-radius:9px;background:#fffef8;grid-template-columns:1fr 1fr}
@keyframes ag-tool-in{from{opacity:.65;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:1050px){.ag-workspace{grid-template-columns:minmax(0,1.5fr) minmax(305px,.9fr)}.ag-map{height:480px}.ag-tool-content{min-height:265px}}
@media(max-width:850px){.ag-workspace{grid-template-columns:1fr}.ag-map{height:min(58vw,470px);min-height:360px}.ag-rail{display:grid;grid-template-columns:1fr 1fr;align-items:start}.ag-risk-card,.ag-tools-card{grid-column:span 2}.ag-tool-content{min-height:0}.ag-support{display:block}.ag-api-content{grid-template-columns:1fr}}
@media(max-width:590px){.ag-map{height:390px;min-height:390px}.ag-rail{display:flex;gap:10px}.ag-risk-card,.ag-tools-card{padding:0}.ag-risk-card{padding:13px}.ag-tools-heading{height:53px;padding:0 12px}.ag-tool-tabs{padding:0 8px 8px;gap:4px}.ag-tool-tabs button{gap:4px;height:35px;font-size:8px}.ag-tool-tabs button svg{width:12px;height:12px}.ag-tool-content{padding:12px;min-height:0}.ag-tool-intro{margin-bottom:10px}.ag-disclosure-head{min-height:58px;padding:8px 10px;gap:8px}.ag-disclosure-copy small{font-size:8px}.ag-disclosure-open{font-size:9px;gap:3px}.ag-disclosure-icon{height:29px;width:29px}.ag-register-actions{padding:8px 10px}.ag-record-foot{padding:8px 10px}.ag-record-foot{align-items:flex-start;flex-direction:column;gap:4px}.ag-marker-table th:first-child,.ag-marker-table td:first-child{padding-left:12px}.ag-marker-table th,.ag-marker-table td{padding-left:9px;padding-right:9px}.ag-api-content{grid-template-columns:1fr}.ag-api-intro,.ag-api-status{grid-column:1}}
`;

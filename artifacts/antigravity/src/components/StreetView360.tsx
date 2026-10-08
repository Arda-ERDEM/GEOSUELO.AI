import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Compass, Eye, Navigation, Crosshair, MapPin, ZoomIn, ZoomOut,
  Maximize2, Minimize2, Move, Layers, AlertCircle, ArrowUp, ArrowDown,
  RotateCcw, Sparkles, Check, X
} from 'lucide-react';
import type { Coordinate, SurfaceMarker, UndergroundAsset } from '@workspace/api-client-react';

interface StreetView360Props {
  center: Coordinate;
  onCenterChange: (coord: Coordinate) => void;
  markers: SurfaceMarker[];
  assets: UndergroundAsset[];
  onAddWaypoint: (coord: Coordinate, isStart: boolean, utilityType: string) => void;
  activeTool: 'start-wp' | 'end-wp' | 'select';
  setActiveTool: (tool: 'start-wp' | 'end-wp' | 'select') => void;
  selectedUtility: string;
  onClose?: () => void;
  isSplit?: boolean;
  onToggleSplit?: () => void;
}

const UTILITY_COLORS: Record<string, string> = {
  water: '#1e90ff',
  gas: '#ffcc00',
  electric: '#ff3333',
  fiber: '#ff6600',
  sewer: '#33cc33'
};

export const StreetView360: React.FC<StreetView360Props> = ({
  center,
  onCenterChange,
  markers,
  assets,
  onAddWaypoint,
  activeTool,
  setActiveTool,
  selectedUtility,
  onClose,
  isSplit = true,
  onToggleSplit
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera angles
  const [yaw, setYaw] = useState<number>(30); // 0 = North, 90 = East, 180 = South, 270 = West
  const [pitch, setPitch] = useState<number>(-12); // -90 look down to ground, +90 look up to sky
  const [fov, setFov] = useState<number>(75); // Field of view in degrees
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, initialYaw: 0, initialPitch: 0 });

  // Raycast hover state on ground
  const [groundHover, setGroundHover] = useState<{
    dist: number; // meters from camera
    angle: number; // degrees relative to camera heading
    coord: Coordinate;
    canvasX: number;
    canvasY: number;
  } | null>(null);

  // AR X-Ray mode to see underground pipes glowing through asphalt
  const [xrayMode, setXrayMode] = useState<boolean>(true);

  // Quick announcement toast inside street view
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Convert distance and relative angle from camera into real GPS coordinates
  const calculateGPS = useCallback((distMeters: number, headingDeg: number): Coordinate => {
    const rad = (headingDeg * Math.PI) / 180;
    const dx = distMeters * Math.sin(rad); // Easting in meters
    const dy = distMeters * Math.cos(rad); // Northing in meters
    const latOffset = dy / 111320;
    const lonOffset = dx / (111320 * Math.cos((center.lat * Math.PI) / 180));
    return {
      lat: Number((center.lat + latOffset).toFixed(7)),
      lon: Number((center.lon + lonOffset).toFixed(7))
    };
  }, [center]);

  // Handle Walking / Moving forward or back on street
  const moveCamera = (meters: number) => {
    const newCoord = calculateGPS(meters, yaw);
    onCenterChange(newCoord);
    setLastAction(`${meters > 0 ? 'İleri' : 'Geri'} hareket edildi (${Math.abs(meters)}m)`);
    setTimeout(() => setLastAction(null), 2000);
  };

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Horizon line in screen space based on pitch
      // pitch = 0 means horizon is at center height / 2
      const pitchRad = (pitch * Math.PI) / 180;
      const horizonY = height / 2 - Math.tan(pitchRad) * (height / (2 * Math.tan(((fov / 2) * Math.PI) / 180)));

      // --- 1. SKY GRADIENT ---
      const skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(0, horizonY));
      skyGrad.addColorStop(0, '#101c2e');
      skyGrad.addColorStop(0.5, '#284162');
      skyGrad.addColorStop(1, '#6888a7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, Math.max(0, horizonY));

      // Sun / Ambient Light in sky
      const sunYawOffset = ((yaw - 140 + 360) % 360) - 180;
      if (Math.abs(sunYawOffset) < fov) {
        const sunX = width / 2 + (sunYawOffset / fov) * width;
        const sunY = horizonY - 140;
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 100);
        sunGrad.addColorStop(0, 'rgba(255, 245, 200, 0.9)');
        sunGrad.addColorStop(0.3, 'rgba(255, 210, 140, 0.3)');
        sunGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 100, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 2. 360 PANORAMA BUILDINGS & URBAN SILHOUETTE ---
      // We generate continuous repeating building profiles mapped to yaw (0-360)
      ctx.save();
      for (let deg = -fov; deg <= fov; deg += 4) {
        const currentWorldDeg = (yaw + deg + 360) % 360;
        const screenX = width / 2 + (deg / fov) * width;

        // Deterministic building height based on world angle
        const seed = Math.sin(currentWorldDeg * 0.15) * 35 + Math.cos(currentWorldDeg * 0.05) * 50 + 75;
        const bHeight = Math.max(30, seed);
        const bTop = horizonY - bHeight;

        ctx.fillStyle = (Math.floor(currentWorldDeg / 15) % 2 === 0) ? '#1f2937' : '#18202c';
        ctx.fillRect(screenX - 20, bTop, 45, horizonY - bTop);

        // Window lights
        if (horizonY > 100) {
          ctx.fillStyle = (Math.sin(currentWorldDeg * 12) > 0.2) ? 'rgba(255, 220, 130, 0.65)' : 'rgba(70, 90, 110, 0.4)';
          for (let wy = bTop + 8; wy < horizonY - 10; wy += 14) {
            ctx.fillRect(screenX - 10, wy, 6, 8);
            ctx.fillRect(screenX + 8, wy, 6, 8);
          }
        }
      }
      ctx.restore();

      // --- 3. STREET ASPHALT & SIDEWALK (PERSPECTIVE GROUND) ---
      const groundGrad = ctx.createLinearGradient(0, horizonY, 0, height);
      groundGrad.addColorStop(0, '#2b3038');
      groundGrad.addColorStop(0.3, '#22252a');
      groundGrad.addColorStop(1, '#181a1e');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, Math.max(0, horizonY), width, height - Math.max(0, horizonY));

      // Perspective Grid Lines on Asphalt
      if (horizonY < height) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1;

        // Longitudinal street lines radiating from vanishing point
        for (let x = -width; x <= width * 2; x += 90) {
          ctx.beginPath();
          ctx.moveTo(width / 2, horizonY);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // Distance rings on ground (1m, 3m, 5m, 10m, 15m, 20m)
        const distances = [1.5, 3, 5, 8, 12, 18, 25];
        for (const d of distances) {
          // Camera height = 1.6m
          // ground Y projection = horizonY + (cameraHeight / d) * focalFactor
          const focal = height / (2 * Math.tan(((fov / 2) * Math.PI) / 180));
          const y = horizonY + (1.6 / d) * focal;
          if (y > horizonY && y < height) {
            ctx.strokeStyle = d === 5 ? 'rgba(0, 190, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)';
            ctx.beginPath();
            ctx.ellipse(width / 2, y, (width / 2) * (1 - (y - horizonY) / height + 0.3), 12, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Distance label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.font = '10px monospace';
            ctx.fillText(`${d}m`, width / 2 - 12, y - 4);
          }
        }

        // Street Yellow / White Centerline
        const focal = height / (2 * Math.tan(((fov / 2) * Math.PI) / 180));
        ctx.strokeStyle = '#e6b800';
        ctx.lineWidth = 4;
        ctx.setLineDash([16, 12]);
        ctx.beginPath();
        ctx.moveTo(width / 2, horizonY);
        ctx.lineTo(width / 2, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Sidewalk curb lines
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(width / 2, horizonY);
        ctx.lineTo(-width * 0.4, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(width / 2, horizonY);
        ctx.lineTo(width * 1.4, height);
        ctx.stroke();
      }

      // --- 4. SUBTERRANEAN X-RAY PIPES (UNDERGROUND AR MODE) ---
      if (xrayMode && assets.length > 0) {
        ctx.save();
        assets.forEach((asset) => {
          // Calculate relative distance and azimuth of asset start & end from current camera center
          const getScreenPos = (pt: Coordinate) => {
            const dy = (pt.lat - center.lat) * 111320;
            const dx = (pt.lon - center.lon) * 111320 * Math.cos((center.lat * Math.PI) / 180);
            const dist = Math.sqrt(dx * dx + dy * dy);
            let bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
            if (bearing < 0) bearing += 360;

            const diff = ((bearing - yaw + 540) % 360) - 180;
            if (Math.abs(diff) < fov * 0.9 && dist > 0.5) {
              const focal = height / (2 * Math.tan(((fov / 2) * Math.PI) / 180));
              const screenX = width / 2 + (diff / fov) * width;
              const screenY = horizonY + (1.6 / dist) * focal;
              return { x: screenX, y: screenY, dist };
            }
            return null;
          };

          const p1 = getScreenPos(asset.start);
          const p2 = getScreenPos(asset.end);

          if (p1 && p2) {
            const pipeColor = UTILITY_COLORS[asset.utilityType] || '#00e5ff';

            // Glow under asphalt
            ctx.shadowColor = pipeColor;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = pipeColor;
            ctx.lineWidth = 5;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;

            // Pipe depth label at midpoint
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(midX - 50, midY - 14, 100, 18);
            ctx.strokeStyle = pipeColor;
            ctx.strokeRect(midX - 50, midY - 14, 100, 18);
            ctx.fillStyle = pipeColor;
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText(`⊘ ${asset.utilityType.toUpperCase()} (-${(asset.depthMeters ?? 1.4).toFixed(1)}m)`, midX - 44, midY - 2);
          }
        });
        ctx.restore();
      }

      // --- 5. 3D PROJECTED WAYPOINTS (SURFACE MARKERS) ON STREET ---
      markers.forEach((m) => {
        const dy = (m.lat - center.lat) * 111320;
        const dx = (m.lon - center.lon) * 111320 * Math.cos((center.lat * Math.PI) / 180);
        const dist = Math.sqrt(dx * dx + dy * dy);
        let bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
        if (bearing < 0) bearing += 360;

        const diff = ((bearing - yaw + 540) % 360) - 180;
        if (Math.abs(diff) < fov * 0.95 && dist > 0.8 && dist < 120) {
          const focal = height / (2 * Math.tan(((fov / 2) * Math.PI) / 180));
          const screenX = width / 2 + (diff / fov) * width;
          const screenY = horizonY + (1.6 / dist) * focal;

          if (screenY > horizonY && screenY < height + 40) {
            const markerColor = UTILITY_COLORS[m.utilityType] || '#00e5ff';

            // Ground plate / manhole ring
            ctx.save();
            ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
            ctx.strokeStyle = markerColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(screenX, screenY, Math.max(12, 140 / dist), Math.max(5, 45 / dist), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 3D Pin Pole rising from ground
            const pinHeight = Math.max(35, 180 / dist);
            const pinTopY = screenY - pinHeight;

            ctx.strokeStyle = markerColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(screenX, pinTopY);
            ctx.stroke();

            // Pin Head
            ctx.fillStyle = markerColor;
            ctx.beginPath();
            ctx.arc(screenX, pinTopY, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(screenX, pinTopY, 3, 0, Math.PI * 2);
            ctx.fill();

            // Floating Label Badge
            const label = m.name;
            ctx.font = 'bold 11px sans-serif';
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = 'rgba(20, 24, 30, 0.92)';
            ctx.strokeStyle = markerColor;
            ctx.lineWidth = 1;
            ctx.fillRect(screenX - textWidth / 2 - 8, pinTopY - 26, textWidth + 16, 20);
            ctx.strokeRect(screenX - textWidth / 2 - 8, pinTopY - 26, textWidth + 16, 20);

            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, screenX - textWidth / 2, pinTopY - 12);

            ctx.restore();
          }
        }
      });

      // --- 6. INTERACTIVE GROUND HOVER TARGET (RAYCAST RETICLE) ---
      if (groundHover && groundHover.canvasY > horizonY) {
        const { canvasX, canvasY, dist, coord } = groundHover;
        const toolColor = activeTool === 'start-wp' ? '#00e5ff' : activeTool === 'end-wp' ? '#ff3366' : '#ffcc00';

        ctx.save();
        ctx.strokeStyle = toolColor;
        ctx.lineWidth = 2;

        // Pulsing ground ellipse
        const pulse = (Date.now() % 1000) / 1000;
        ctx.beginPath();
        ctx.ellipse(canvasX, canvasY, 26 + pulse * 6, 9 + pulse * 2, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(canvasX, canvasY, 14, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = toolColor;
        ctx.fill();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(canvasX - 35, canvasY);
        ctx.lineTo(canvasX + 35, canvasY);
        ctx.moveTo(canvasX, canvasY - 15);
        ctx.lineTo(canvasX, canvasY + 15);
        ctx.stroke();

        // Hover Tooltip Info
        const info = activeTool === 'start-wp'
          ? `[📍 Başlangıç At: ${dist.toFixed(1)}m]`
          : activeTool === 'end-wp'
            ? `[🏁 Bitiş At: ${dist.toFixed(1)}m]`
            : `[Zemin: ${dist.toFixed(1)}m]`;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.strokeStyle = toolColor;
        ctx.fillRect(canvasX + 18, canvasY - 28, 160, 36);
        ctx.strokeRect(canvasX + 18, canvasY - 28, 160, 36);

        ctx.fillStyle = toolColor;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(info, canvasX + 24, canvasY - 14);
        ctx.fillStyle = '#ccc';
        ctx.font = '9px monospace';
        ctx.fillText(`${coord.lat.toFixed(5)}, ${coord.lon.toFixed(5)}`, canvasX + 24, canvasY - 2);

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [yaw, pitch, fov, center, markers, assets, groundHover, xrayMode, activeTool]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.parentElement?.clientWidth || 800;
        canvasRef.current.height = canvasRef.current.parentElement?.clientHeight || 600;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse drag for 360 yaw/pitch
  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      initialYaw: yaw,
      initialPitch: pitch
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const sensitivity = fov / canvas.width;

      const newYaw = (dragStart.current.initialYaw - dx * sensitivity + 360) % 360;
      const newPitch = Math.max(-75, Math.min(30, dragStart.current.initialPitch + dy * sensitivity));

      setYaw(newYaw);
      setPitch(newPitch);
    } else {
      // Calculate ground hit for raycast
      const height = canvas.height;
      const pitchRad = (pitch * Math.PI) / 180;
      const horizonY = height / 2 - Math.tan(pitchRad) * (height / (2 * Math.tan(((fov / 2) * Math.PI) / 180)));

      if (mouseY > horizonY + 8) {
        const focal = height / (2 * Math.tan(((fov / 2) * Math.PI) / 180));
        const dist = Math.max(0.5, (1.6 * focal) / (mouseY - horizonY));
        const angleOffset = ((mouseX - canvas.width / 2) / canvas.width) * fov;
        const hitHeading = (yaw + angleOffset + 360) % 360;
        const hitCoord = calculateGPS(dist, hitHeading);

        setGroundHover({
          dist,
          angle: hitHeading,
          coord: hitCoord,
          canvasX: mouseX,
          canvasY: mouseY
        });
      } else {
        setGroundHover(null);
      }
    }
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  // Canvas Click: Drop Waypoint
  const onCanvasClick = (e: React.MouseEvent) => {
    // If was dragging significantly, do not drop waypoint
    const dx = Math.abs(e.clientX - dragStart.current.x);
    const dy = Math.abs(e.clientY - dragStart.current.y);
    if (dx > 4 || dy > 4) return;

    if (groundHover && (activeTool === 'start-wp' || activeTool === 'end-wp')) {
      const isStart = activeTool === 'start-wp';
      onAddWaypoint(groundHover.coord, isStart, selectedUtility);
      setLastAction(`📍 Sokaktan ${isStart ? 'Başlangıç' : 'Bitiş'} Waypoint'i eklendi! (${groundHover.dist.toFixed(1)}m mesafe)`);
      setTimeout(() => setLastAction(null), 3000);
      setActiveTool('select');
    }
  };

  // Cardinal direction text
  const getCardinal = (deg: number) => {
    const val = Math.round(deg / 45) % 8;
    const cardinals = ['K (0°)', 'KD (45°)', 'D (90°)', 'GD (135°)', 'G (180°)', 'GB (225°)', 'B (270°)', 'KB (315°)'];
    return cardinals[val];
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0d14', overflow: 'hidden', userSelect: 'none' }}>
      {/* 360 CANVAS */}
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { setIsDragging(false); setGroundHover(null); }}
        onClick={onCanvasClick}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: isDragging ? 'grabbing' : activeTool !== 'select' ? 'crosshair' : 'grab'
        }}
      />

      {/* TOP HUD BAR */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 100
      }}>
        {/* Location Badge */}
        <div style={{
          background: 'rgba(20, 26, 36, 0.88)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #334155',
          borderRadius: 6,
          padding: '6px 12px',
          color: '#fff',
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          pointerEvents: 'auto',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00e5ff', fontWeight: 'bold' }}>
            <Eye size={14} /> 360° SOKAK GÖRÜNÜMÜ
          </div>
          <div style={{ width: 1, height: 14, background: '#475569' }} />
          <div style={{ fontFamily: 'monospace', color: '#94a3b8' }}>
            {center.lat.toFixed(5)}°N, {center.lon.toFixed(5)}°E
          </div>
          <div style={{ width: 1, height: 14, background: '#475569' }} />
          <div style={{ color: '#e2e8f0', fontSize: 10 }}>
            Göz Hizası: <strong>1.65m</strong>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: 6, pointerEvents: 'auto' }}>
          {/* AR X-Ray Toggle */}
          <button
            onClick={() => setXrayMode(!xrayMode)}
            style={{
              background: xrayMode ? '#0284c7' : '#1e293b',
              border: '1px solid #475569',
              color: '#fff',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
            title="Yeraltı borularını asfaltta 3D röntgen olarak göster"
          >
            <Sparkles size={13} color={xrayMode ? '#fff' : '#38bdf8'} />
            Yer Altı Röntgeni (AR)
          </button>

          {/* Compass / Reset North */}
          <button
            onClick={() => { setYaw(0); setPitch(-10); }}
            style={{
              background: '#1e293b',
              border: '1px solid #475569',
              color: '#f8fafc',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
            title="Kuzeye dön ve açıyı sıfırla"
          >
            <RotateCcw size={13} />
            {getCardinal(yaw)}
          </button>

          {/* Split / Fullscreen Toggle */}
          {onToggleSplit && (
            <button
              onClick={onToggleSplit}
              style={{
                background: '#1e293b',
                border: '1px solid #475569',
                color: '#fff',
                borderRadius: 6,
                padding: '6px 8px',
                cursor: 'pointer'
              }}
              title={isSplit ? 'Tam Ekran Yap' : 'Bölünmüş Ekran'}
            >
              {isSplit ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
          )}

          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: '#dc2626',
                border: 'none',
                color: '#fff',
                borderRadius: 6,
                padding: '6px 8px',
                cursor: 'pointer'
              }}
              title="Kapat"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* QUICK WAYPOINT TOOLBAR ON STREET VIEW */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(10px)',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        zIndex: 100,
        boxShadow: '0 8px 30px rgba(0,0,0,0.7)'
      }}>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
          Sokaktan Waypoint:
        </div>

        <button
          onClick={() => setActiveTool(activeTool === 'start-wp' ? 'select' : 'start-wp')}
          style={{
            background: activeTool === 'start-wp' ? '#0284c7' : '#1e293b',
            border: activeTool === 'start-wp' ? '1px solid #38bdf8' : '1px solid #475569',
            color: '#fff',
            borderRadius: 5,
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            transition: '0.2s'
          }}
        >
          📍 Başlangıç At
        </button>

        <button
          onClick={() => setActiveTool(activeTool === 'end-wp' ? 'select' : 'end-wp')}
          style={{
            background: activeTool === 'end-wp' ? '#e11d48' : '#1e293b',
            border: activeTool === 'end-wp' ? '1px solid #fb7185' : '1px solid #475569',
            color: '#fff',
            borderRadius: 5,
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            transition: '0.2s'
          }}
        >
          🏁 Bitiş At
        </button>

        <div style={{ width: 1, height: 20, background: '#334155' }} />

        {/* Walk / Step Controls */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => moveCamera(5)}
            style={{
              background: '#1e293b',
              border: '1px solid #475569',
              color: '#e2e8f0',
              borderRadius: 5,
              padding: '6px 10px',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer'
            }}
            title="Sokakta 5 metre ileri yürü"
          >
            <ArrowUp size={13} color="#22c55e" /> İleri (5m)
          </button>
          <button
            onClick={() => moveCamera(-5)}
            style={{
              background: '#1e293b',
              border: '1px solid #475569',
              color: '#e2e8f0',
              borderRadius: 5,
              padding: '6px 10px',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer'
            }}
            title="Sokakta 5 metre geri yürü"
          >
            <ArrowDown size={13} color="#f97316" /> Geri (5m)
          </button>
        </div>
      </div>

      {/* COMPASS RADAR IN TOP RIGHT */}
      <div style={{
        position: 'absolute',
        top: 60,
        right: 14,
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '2px solid #475569',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 90
      }}>
        <div style={{
          transform: `rotate(${-yaw}deg)`,
          transition: 'transform 0.05s linear',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%'
        }}>
          <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 10 }}>▲ K</div>
          <div style={{ height: 16 }} />
          <div style={{ color: '#94a3b8', fontSize: 9 }}>G</div>
        </div>
      </div>

      {/* INTERACTIVE HINT / LAST ACTION TOAST */}
      {lastAction && (
        <div style={{
          position: 'absolute',
          top: 65,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(34, 197, 94, 0.95)',
          color: '#fff',
          padding: '6px 16px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          zIndex: 200
        }}>
          {lastAction}
        </div>
      )}

      {/* HELP HINT WHEN IN WAYPOINT MODE */}
      {activeTool !== 'select' && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 14,
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid #0284c7',
          padding: '6px 12px',
          borderRadius: 6,
          color: '#38bdf8',
          fontSize: 10,
          pointerEvents: 'none',
          zIndex: 90
        }}>
          ⚡ Asfalta veya kaldırıma tıklayarak waypoint atın
        </div>
      )}
    </div>
  );
};

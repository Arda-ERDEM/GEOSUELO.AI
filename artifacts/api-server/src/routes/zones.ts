import { Router, type IRouter } from "express";
import { asc, eq, sql } from "drizzle-orm";
import {
  AnalyzeZoneParams,
  AnalyzeZoneResponse,
  CreateZoneBody,
  CreateZoneResponse,
  GetZonesResponse,
} from "@workspace/api-zod";
import { db, undergroundAssetsTable, zonesTable } from "@workspace/db";

const router: IRouter = Router();

function zoneDto(zone: typeof zonesTable.$inferSelect) {
  return {
    ...zone,
    polygon: zone.polygon,
    createdAt: zone.createdAt.toISOString(),
  };
}

function assetDto(asset: typeof undergroundAssetsTable.$inferSelect) {
  return {
    id: asset.id,
    utilityType: asset.utilityType,
    start: { lat: asset.startLat, lon: asset.startLon },
    end: { lat: asset.endLat, lon: asset.endLon },
    depthMeters: asset.depthMeters,
    confidence: asset.confidence,
    dataSource: asset.dataSource,
    riskLevel: asset.riskLevel,
    createdAt: asset.createdAt.toISOString(),
  };
}

router.get("/v1/zones", async (_req, res): Promise<void> => {
  const zones = await db.select().from(zonesTable).orderBy(asc(zonesTable.createdAt));
  res.json(GetZonesResponse.parse(zones.map(zoneDto)));
});

router.post("/v1/zones", async (req, res): Promise<void> => {
  const input = CreateZoneBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const [created] = await db.insert(zonesTable).values(input.data).returning();
  res.status(201).json(CreateZoneResponse.parse(zoneDto(created)));
});

router.post("/v1/zones/:id/analyze", async (req, res): Promise<void> => {
  const params = AnalyzeZoneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [zone] = await db
    .select()
    .from(zonesTable)
    .where(eq(zonesTable.id, params.data.id))
    .limit(1);
  if (!zone) {
    res.status(404).json({ error: "Excavation zone not found" });
    return;
  }
  const assets = await db.select().from(undergroundAssetsTable);
  const ring = [...zone.polygon, zone.polygon[0]].map(({ lat, lon }) => [lon, lat]);
  const polygonGeoJson = JSON.stringify({
    type: "Polygon",
    coordinates: [ring],
  });
  const spatialMatches = await db.execute(sql`
    SELECT id
    FROM underground_assets
    WHERE ST_Intersects(
      ST_SetSRID(
        ST_MakeLine(
          ST_MakePoint(start_lon, start_lat),
          ST_MakePoint(end_lon, end_lat)
        ),
        4326
      ),
      ST_SetSRID(ST_GeomFromGeoJSON(${polygonGeoJson}), 4326)
    )
  `);
  const conflictIds = new Set(spatialMatches.rows.map((row) => String(row.id)));
  const conflicts = assets
    .filter((asset) => conflictIds.has(asset.id))
    .map((asset) => ({ asset: assetDto(asset), distanceMeters: 0 }));
  const severity: Record<string, number> = {
    gas: 35,
    electric: 28,
    water: 18,
    sewer: 14,
    fiber: 16,
  };
  const riskScore = Math.min(
    100,
    conflicts.reduce(
      (total, conflict) =>
        total +
        (severity[conflict.asset.utilityType] ?? 15) +
        conflict.asset.riskLevel * 5,
      0,
    ),
  );
  const riskLevel =
    riskScore >= 75
      ? "critical"
      : riskScore >= 46
        ? "high"
        : riskScore >= 21
          ? "medium"
          : "low";
  const message =
    conflicts.length === 0
      ? "Bu kazı alanında kayıtlı tahmini hatlarla kesişme bulunmadı. Bu sonuç güvenli kazı garantisi değildir."
      : `DİKKAT: Bu alanda ${conflicts.length} tahmini altyapı hattı kesişiyor. En yüksek tahmin güveni ${(Math.max(...conflicts.map(({ asset }) => asset.confidence)) * 100).toFixed(0)}%, tahmini derinlik ${Math.min(...conflicts.map(({ asset }) => asset.depthMeters)).toFixed(1)} m. Kazı risk puanı: ${riskScore}/100 (${riskLevel}).`;
  const evidence =
    conflicts.length === 0
      ? [
          "Kazı poligonu, kayıtlı vektör hatlarıyla PostGIS ST_Intersects kullanılarak karşılaştırıldı; kayıtlı hatlarla kesişme bulunmadı.",
          "Sonuç yalnızca sistemde kayıtlı hatları kapsar; eksik veya kaydedilmemiş altyapıyı dışlamaz.",
        ]
      : [
          `PostGIS ST_Intersects, kazı poligonu ile ${conflicts.length} kayıtlı hat arasında kesişme buldu.`,
          `Çakışan hat kaynakları: ${[...new Set(conflicts.map(({ asset }) => asset.dataSource))].join(", ")}.`,
          "Güven puanı model çıktısının güven değeridir; kalibre edilmiş kaza olasılığı değildir.",
          "Risk puanı hat türü ve kayıtlı risk seviyesinden üretilen sezgisel bir endekstir; parasal hasar tahmini değildir.",
        ];
  const unknowns = [
    "Hat malzemesi ve yapım yılı kayıtlarda bulunmuyor.",
    "Belediye/işletmeci proje kayıtları ve gerçek GPR ya da saha ölçümü bu analize dahil değil.",
    "Malzeme, yaş ve maliyet verisi olmadığından parasal hasar tutarı hesaplanmadı.",
  ];
  const recommendedActions =
    conflicts.length === 0
      ? [
          "Kayıtlı hatlarla kesişme olmaması güvenli kazı anlamına gelmez; güncel işletmeci kayıtlarını ayrıca doğrulayın.",
          "Kazı öncesinde sahada yetkili ekip ve uygun altyapı tespit yöntemiyle kontrol yapın.",
        ]
      : [
          "Kazı öncesinde ilgili altyapı işletmecisinden güncel hat projesi ve çalışma izni teyidi alın.",
          "Tahmini konumu sahada yetkili ekip ve uygun altyapı tespit yöntemiyle doğrulayın.",
          "Bu sentetik ön taramayı tek başına kazı izni veya güvenlik kararı olarak kullanmayın.",
        ];
  res.json(
    AnalyzeZoneResponse.parse({
      zone: zoneDto(zone),
      riskScore,
      riskLevel,
      assessmentMethod: "postgis_synthetic_vector_screening",
      conflicts,
      message,
      evidence,
      unknowns,
      recommendedActions,
      financialImpact: {
        estimated: false,
        amount: null,
        currency: null,
        reason:
          "Hat malzemesi, yapım yılı ve doğrulanmış hasar maliyetleri bulunmadığından güvenilir parasal tahmin üretilemiyor.",
      },
    }),
  );
});

export default router;

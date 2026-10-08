import { Router, type IRouter, type Request } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  GetAssetsGeojsonResponse,
  GetAssetsQueryParams,
  GetAssetsResponse,
  PredictRouteBody,
  PredictRouteResponse,
} from "@workspace/api-zod";
import {
  db,
  surfaceMarkersTable,
  undergroundAssetsTable,
} from "@workspace/db";
import { distanceMeters } from "../lib/geo";
import { mockMarkers } from "./markers";

const router: IRouter = Router();

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

let mockAssets: any[] = [
  // WATER PIPES
  { id: "w1", utilityType: "water", startLat: 40.988, startLon: 29.025, endLat: 40.993, endLon: 29.035, depthMeters: 1.4, confidence: 0.9, dataSource: "manual", riskLevel: 3, createdAt: new Date() },
  { id: "w2", utilityType: "water", startLat: 40.989, startLon: 29.027, endLat: 40.985, endLon: 29.030, depthMeters: 1.2, confidence: 0.8, dataSource: "manual", riskLevel: 2, createdAt: new Date() },
  
  // GAS PIPES
  { id: "g1", utilityType: "gas", startLat: 40.987, startLon: 29.022, endLat: 40.992, endLon: 29.030, depthMeters: 1.0, confidence: 0.95, dataSource: "manual", riskLevel: 4, createdAt: new Date() },
  { id: "g2", utilityType: "gas", startLat: 40.992, startLon: 29.030, endLat: 40.995, endLon: 29.038, depthMeters: 1.1, confidence: 0.85, dataSource: "manual", riskLevel: 4, createdAt: new Date() },
  
  // FIBER / ELECTRIC
  { id: "f1", utilityType: "fiber", startLat: 40.990, startLon: 29.020, endLat: 40.990, endLon: 29.035, depthMeters: 0.6, confidence: 0.99, dataSource: "manual", riskLevel: 2, createdAt: new Date() },
  { id: "e1", utilityType: "electric", startLat: 40.986, startLon: 29.032, endLat: 40.995, endLon: 29.035, depthMeters: 0.8, confidence: 0.9, dataSource: "manual", riskLevel: 3, createdAt: new Date() },
];

async function findNearbyAssets(lat: number, lon: number, radius: number) {
  // Return all mock assets for simplicity
  return mockAssets;
}

function parseNearbyQuery(req: Request) {
  return GetAssetsQueryParams.safeParse({
    lat: Number(req.query.lat),
    lon: Number(req.query.lon),
    radius: req.query.radius === undefined ? undefined : Number(req.query.radius),
  });
}

router.get("/v1/assets", async (req, res): Promise<void> => {
  const query = parseNearbyQuery(req);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const nearby = await findNearbyAssets(query.data.lat, query.data.lon, query.data.radius ?? 500);
  res.json(GetAssetsResponse.parse(nearby.map(assetDto)));
});

router.get("/v1/assets.geojson", async (req, res): Promise<void> => {
  const query = parseNearbyQuery(req);
  if (!query.success) return;
  const nearby = await findNearbyAssets(query.data.lat, query.data.lon, query.data.radius ?? 500);
  const featureCollection = {
    type: "FeatureCollection",
    features: nearby.map((asset) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[asset.startLon, asset.startLat], [asset.endLon, asset.endLat]] },
      properties: {
        id: asset.id, utilityType: asset.utilityType, depthMeters: asset.depthMeters,
        confidence: asset.confidence, dataSource: asset.dataSource, riskLevel: asset.riskLevel, createdAt: asset.createdAt.toISOString()
      },
    })),
  };
  res.type("application/geo+json").json(GetAssetsGeojsonResponse.parse(featureCollection));
});

router.post("/v1/predictions", async (req, res): Promise<void> => {
  const input = PredictRouteBody.safeParse(req.body);
  if (!input.success) return;
  const markerA = mockMarkers.find(m => m.id === input.data.markerAId) || { id: input.data.markerAId, lat: 40.99, lon: 29.03, utilityType: "water", confidence: 0.9 };
  const markerB = mockMarkers.find(m => m.id === input.data.markerBId) || { id: input.data.markerBId, lat: 40.995, lon: 29.035, utilityType: "water", confidence: 0.8 };
  
  const created = {
    id: Math.random().toString(36).slice(2),
    utilityType: markerA.utilityType,
    startLat: markerA.lat,
    startLon: markerA.lon,
    endLat: markerB.lat,
    endLon: markerB.lon,
    depthMeters: 1.4,
    confidence: 0.85,
    dataSource: "ai_prediction",
    riskLevel: 3,
    createdAt: new Date()
  };
  mockAssets.push(created);
  res.status(201).json(PredictRouteResponse.parse(assetDto(created)));
});

router.delete("/v1/predictions", async (_req, res): Promise<void> => {
  mockAssets = mockAssets.filter((asset) => asset.dataSource !== "ai_prediction");
  res.status(204).end();
});

export function removePredictionsAt(lat: number, lon: number) {
  const at = (a: number, b: number) => Math.abs(a - b) < 1e-7;
  mockAssets = mockAssets.filter((asset) => !(asset.dataSource === "ai_prediction" &&
    ((at(asset.startLat, lat) && at(asset.startLon, lon)) || (at(asset.endLat, lat) && at(asset.endLon, lon)))));
}

export default router;

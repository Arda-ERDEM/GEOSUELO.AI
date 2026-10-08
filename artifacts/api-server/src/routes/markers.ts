import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  CreateMarkerBody,
  CreateMarkerResponse,
  DeleteMarkerParams,
  GetMarkersResponse,
  UpdateMarkerBody,
  UpdateMarkerParams,
  UpdateMarkerResponse,
} from "@workspace/api-zod";
import { db, surfaceMarkersTable } from "@workspace/db";
import { removePredictionsAt } from "./assets";

const router: IRouter = Router();

function markerDto(marker: typeof surfaceMarkersTable.$inferSelect) {
  return {
    ...marker,
    createdAt: marker.createdAt.toISOString(),
  };
}

export let mockMarkers: any[] = [
  {
    id: "m1", name: "Ana Vana", lat: 40.99, lon: 29.03, type: "valve", utilityType: "water", confidence: 0.9, createdAt: new Date()
  },
  {
    id: "m2", name: "Dağıtım Vanası", lat: 40.992, lon: 29.032, type: "valve", utilityType: "water", confidence: 0.8, createdAt: new Date()
  }
];

router.get("/v1/markers", async (_req, res): Promise<void> => {
  res.json(GetMarkersResponse.parse(mockMarkers.map(markerDto)));
});

router.post("/v1/markers", async (req, res): Promise<void> => {
  const input = CreateMarkerBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const created = { id: Math.random().toString(36).slice(2), ...input.data, createdAt: new Date() };
  mockMarkers.push(created);
  res.status(201).json(CreateMarkerResponse.parse(markerDto(created)));
});

router.patch("/v1/markers/:id", async (req, res): Promise<void> => {
  const params = UpdateMarkerParams.safeParse(req.params);
  const input = UpdateMarkerBody.safeParse(req.body);
  if (!params.success) return;
  if (!input.success) return;
  const idx = mockMarkers.findIndex(m => m.id === params.data.id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
  mockMarkers[idx] = { ...mockMarkers[idx], ...input.data };
  res.json(UpdateMarkerResponse.parse(markerDto(mockMarkers[idx])));
});

router.delete("/v1/markers/:id", async (req, res): Promise<void> => {
  const params = DeleteMarkerParams.safeParse(req.params);
  if (!params.success) return;
  const target = mockMarkers.find(m => m.id === params.data.id);
  if (target) removePredictionsAt(target.lat, target.lon);
  mockMarkers = mockMarkers.filter(m => m.id !== params.data.id);
  res.status(204).end();
});

export default router;

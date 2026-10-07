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

const router: IRouter = Router();

function markerDto(marker: typeof surfaceMarkersTable.$inferSelect) {
  return {
    ...marker,
    createdAt: marker.createdAt.toISOString(),
  };
}

router.get("/v1/markers", async (_req, res): Promise<void> => {
  const markers = await db
    .select()
    .from(surfaceMarkersTable)
    .orderBy(asc(surfaceMarkersTable.createdAt));
  res.json(GetMarkersResponse.parse(markers.map(markerDto)));
});

router.post("/v1/markers", async (req, res): Promise<void> => {
  const input = CreateMarkerBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const [created] = await db
    .insert(surfaceMarkersTable)
    .values(input.data)
    .returning();
  res.status(201).json(CreateMarkerResponse.parse(markerDto(created)));
});

router.patch("/v1/markers/:id", async (req, res): Promise<void> => {
  const params = UpdateMarkerParams.safeParse(req.params);
  const input = UpdateMarkerBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const [updated] = await db
    .update(surfaceMarkersTable)
    .set(input.data)
    .where(eq(surfaceMarkersTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Surface marker not found" });
    return;
  }
  res.json(UpdateMarkerResponse.parse(markerDto(updated)));
});

router.delete("/v1/markers/:id", async (req, res): Promise<void> => {
  const params = DeleteMarkerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(surfaceMarkersTable)
    .where(eq(surfaceMarkersTable.id, params.data.id))
    .returning({ id: surfaceMarkersTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Surface marker not found" });
    return;
  }
  res.status(204).end();
});

export default router;

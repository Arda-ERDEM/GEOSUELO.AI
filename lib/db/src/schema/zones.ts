import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export type GeoCoordinate = { lat: number; lon: number };

export const zonesTable = pgTable("zones", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  polygon: jsonb("polygon").$type<GeoCoordinate[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

---
name: AntiGravity backend target
description: Intended backend stack and how it differs from the current running MVP.
---

AntiGravity's project brief targets C# / ASP.NET Core 8 with PostgreSQL and PostGIS. The current Replit preview uses the workspace's shared Node/Express API, while its spatial searches use PostGIS.

**Why:** The user wants the project to demonstrate C# expertise, but the selected runnable web scaffold provides a TypeScript API service. The working MVP should not be described as an ASP.NET implementation.

**How to apply:** Keep the current preview stable unless the user asks for a .NET backend migration. Treat such a migration as a deliberate architecture change and carry over the existing OpenAPI contract and PostGIS behavior.

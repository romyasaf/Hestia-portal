import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import pg from "pg";
import { apiEnv } from "./env.js";

const app = express();
const port = apiEnv.port;
const jwtAccessSecret = apiEnv.jwtAccessSecret;
const jwtRefreshSecret = apiEnv.jwtRefreshSecret;
const { Pool } = pg;
const db = new Pool({ connectionString: apiEnv.databaseUrl });

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true
  })
);
app.use(express.json());

type UserRole = "super_admin" | "admin" | "staff" | "tenant" | "owner" | "client";

interface AppUser {
  id: string;
  email: string;
  fullName: string;
  roles: UserRole[];
}

interface PropertyItem {
  id: string;
  code: string;
  name: string;
  addressLine1: string;
  city: string;
  country: string;
  ownerUserId: string | null;
}

interface UnitItem {
  id: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  unitType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  monthlyRent: number | null;
  status: string;
}

interface LeaseRow {
  id: string;
  unitId: string;
  propertyName: string;
  unitNumber: string;
  tenantUserId: string;
  tenantName: string;
  tenantEmail: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  status: string;
}

interface AccessPayload {
  sub: string;
  email: string;
  roles: UserRole[];
}

interface RequestWithAuth extends express.Request {
  authUser?: AccessPayload;
}

const createAccessToken = (user: AppUser) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles
    },
    jwtAccessSecret,
    { expiresIn: "30m" }
  );

const createRefreshToken = (user: AppUser) =>
  jwt.sign(
    {
      sub: user.id
    },
    jwtRefreshSecret,
    { expiresIn: "7d" }
  );

const mapUserWithRoles = async (userId: string): Promise<AppUser | null> => {
  const userResult = await db.query<{ id: string; email: string; full_name: string }>(
    `SELECT id, email, full_name
     FROM users
     WHERE id = $1 AND is_active = true`,
    [userId]
  );

  if (userResult.rowCount === 0) {
    return null;
  }

  const rolesResult = await db.query<{ code: UserRole }>(
    `SELECT r.code
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );

  return {
    id: userResult.rows[0].id,
    email: userResult.rows[0].email,
    fullName: userResult.rows[0].full_name,
    roles: rolesResult.rows.map((row) => row.code)
  };
};

const getBearerToken = (req: express.Request): string | undefined => {
  const header = req.header("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
};

const authMiddleware: express.RequestHandler = (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: "Missing bearer token." });
  }

  try {
    const payload = jwt.verify(token, jwtAccessSecret) as AccessPayload;
    (req as RequestWithAuth).authUser = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token." });
  }
};

const requireAdmin: express.RequestHandler = (req, res, next) => {
  const authUser = (req as RequestWithAuth).authUser;
  const ok = authUser?.roles.some((r) => r === "admin" || r === "super_admin");
  if (!ok) {
    return res.status(403).json({ message: "Admin access required." });
  }
  return next();
};

const requireAdminOrStaff: express.RequestHandler = (req, res, next) => {
  const authUser = (req as RequestWithAuth).authUser;
  if (!authUser?.roles.some((role) => role === "admin" || role === "staff")) {
    return res.status(403).json({ message: "Admin or staff access required." });
  }
  return next();
};

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "api", timestamp: new Date().toISOString() });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const authResult = await db.query<{ id: string }>(
      `SELECT id
       FROM users
       WHERE email = $1
         AND is_active = true
         AND password_hash = crypt($2, password_hash)`,
      [email.toLowerCase(), password]
    );

    if (authResult.rowCount === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = await mapUserWithRoles(authResult.rows[0].id);
    if (!user) {
      return res.status(401).json({ message: "User account is inactive." });
    }

    return res.json({
      accessToken: createAccessToken(user),
      refreshToken: createRefreshToken(user),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Unable to login right now." });
  }
});

app.get("/users", authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const usersResult = await db.query<{
      id: string;
      email: string;
      full_name: string;
      is_active: boolean;
      created_at: string;
      roles: string;
    }>(
      `SELECT
         u.id,
         u.email,
         u.full_name,
         u.is_active,
         u.created_at,
         COALESCE(string_agg(r.code, ',' ORDER BY r.code), '') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    return res.json(
      usersResult.rows.map((row) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        isActive: row.is_active,
        createdAt: row.created_at,
        roles: row.roles ? row.roles.split(",") : []
      }))
    );
  } catch (error) {
    console.error("List users error:", error);
    return res.status(500).json({ message: "Unable to list users right now." });
  }
});

app.post("/users", authMiddleware, requireAdmin, async (req, res) => {
  const {
    email,
    fullName,
    password,
    roles
  } = req.body as {
    email?: string;
    fullName?: string;
    password?: string;
    roles?: UserRole[];
  };

  if (!email || !fullName || !password || !roles?.length) {
    return res.status(400).json({ message: "Email, fullName, password, and roles are required." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const uniqueRoles = [...new Set(roles)];

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const insertedUser = await client.query<{ id: string; email: string; full_name: string }>(
      `INSERT INTO users (email, password_hash, full_name, is_active)
       VALUES ($1, crypt($2, gen_salt('bf')), $3, true)
       RETURNING id, email, full_name`,
      [normalizedEmail, password, fullName.trim()]
    );

    for (const role of uniqueRoles) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT $1, id FROM roles WHERE code = $2
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [insertedUser.rows[0].id, role]
      );
    }

    await client.query("COMMIT");

    const createdUser = await mapUserWithRoles(insertedUser.rows[0].id);
    return res.status(201).json(createdUser);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create user error:", error);
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return res.status(409).json({ message: "A user with this email already exists." });
    }
    return res.status(500).json({ message: "Unable to create user right now." });
  } finally {
    client.release();
  }
});

app.get("/properties", authMiddleware, async (_req, res) => {
  try {
    const result = await db.query<{
      id: string;
      code: string;
      name: string;
      address_line_1: string;
      city: string;
      country: string;
      owner_user_id: string | null;
    }>(
      `SELECT id, code, name, address_line_1, city, country, owner_user_id
       FROM properties
       ORDER BY created_at DESC`
    );

    const properties: PropertyItem[] = result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      addressLine1: row.address_line_1,
      city: row.city,
      country: row.country,
      ownerUserId: row.owner_user_id
    }));

    return res.json(properties);
  } catch (error) {
    console.error("List properties error:", error);
    return res.status(500).json({ message: "Unable to list properties right now." });
  }
});

app.post("/properties", authMiddleware, requireAdmin, async (req, res) => {
  const { code, name, addressLine1, city, country, ownerUserId } = req.body as {
    code?: string;
    name?: string;
    addressLine1?: string;
    city?: string;
    country?: string;
    ownerUserId?: string | null;
  };

  if (!code || !name || !addressLine1 || !city) {
    return res.status(400).json({ message: "code, name, addressLine1, and city are required." });
  }

  try {
    const inserted = await db.query<{
      id: string;
      code: string;
      name: string;
      address_line_1: string;
      city: string;
      country: string;
      owner_user_id: string | null;
    }>(
      `INSERT INTO properties (code, name, address_line_1, city, country, owner_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, code, name, address_line_1, city, country, owner_user_id`,
      [
        code.trim().toUpperCase(),
        name.trim(),
        addressLine1.trim(),
        city.trim(),
        (country ?? "Qatar").trim(),
        ownerUserId ?? null
      ]
    );

    return res.status(201).json({
      id: inserted.rows[0].id,
      code: inserted.rows[0].code,
      name: inserted.rows[0].name,
      addressLine1: inserted.rows[0].address_line_1,
      city: inserted.rows[0].city,
      country: inserted.rows[0].country,
      ownerUserId: inserted.rows[0].owner_user_id
    });
  } catch (error) {
    console.error("Create property error:", error);
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return res.status(409).json({ message: "A property with this code already exists." });
    }
    return res.status(500).json({ message: "Unable to create property right now." });
  }
});

app.get("/units", authMiddleware, async (_req, res) => {
  try {
    const result = await db.query<{
      id: string;
      property_id: string;
      property_name: string;
      unit_number: string;
      unit_type: string | null;
      bedrooms: number | null;
      bathrooms: number | null;
      monthly_rent: string | null;
      status: string;
    }>(
      `SELECT
         u.id,
         u.property_id,
         p.name AS property_name,
         u.unit_number,
         u.unit_type,
         u.bedrooms,
         u.bathrooms,
         u.monthly_rent,
         u.status
       FROM units u
       JOIN properties p ON p.id = u.property_id
       ORDER BY p.name ASC, u.unit_number ASC`
    );

    const units: UnitItem[] = result.rows.map((row) => ({
      id: row.id,
      propertyId: row.property_id,
      propertyName: row.property_name,
      unitNumber: row.unit_number,
      unitType: row.unit_type,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      monthlyRent: row.monthly_rent ? Number(row.monthly_rent) : null,
      status: row.status
    }));

    return res.json(units);
  } catch (error) {
    console.error("List units error:", error);
    return res.status(500).json({ message: "Unable to list units right now." });
  }
});

app.post("/units", authMiddleware, requireAdmin, async (req, res) => {
  const {
    propertyId,
    unitNumber,
    unitType,
    bedrooms,
    bathrooms,
    monthlyRent,
    status
  } = req.body as {
    propertyId?: string;
    unitNumber?: string;
    unitType?: string;
    bedrooms?: number | null;
    bathrooms?: number | null;
    monthlyRent?: number | null;
    status?: string;
  };

  if (!propertyId || !unitNumber) {
    return res.status(400).json({ message: "propertyId and unitNumber are required." });
  }

  try {
    const inserted = await db.query<{
      id: string;
      property_id: string;
      unit_number: string;
      unit_type: string | null;
      bedrooms: number | null;
      bathrooms: number | null;
      monthly_rent: string | null;
      status: string;
    }>(
      `INSERT INTO units (property_id, unit_number, unit_type, bedrooms, bathrooms, monthly_rent, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, property_id, unit_number, unit_type, bedrooms, bathrooms, monthly_rent, status`,
      [
        propertyId,
        unitNumber.trim(),
        unitType?.trim() || null,
        bedrooms ?? null,
        bathrooms ?? null,
        monthlyRent ?? null,
        status?.trim() || "available"
      ]
    );

    const property = await db.query<{ name: string }>(`SELECT name FROM properties WHERE id = $1`, [propertyId]);

    return res.status(201).json({
      id: inserted.rows[0].id,
      propertyId: inserted.rows[0].property_id,
      propertyName: property.rows[0]?.name ?? "",
      unitNumber: inserted.rows[0].unit_number,
      unitType: inserted.rows[0].unit_type,
      bedrooms: inserted.rows[0].bedrooms,
      bathrooms: inserted.rows[0].bathrooms,
      monthlyRent: inserted.rows[0].monthly_rent ? Number(inserted.rows[0].monthly_rent) : null,
      status: inserted.rows[0].status
    });
  } catch (error) {
    console.error("Create unit error:", error);
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return res.status(409).json({ message: "This unit already exists for the selected property." });
    }
    return res.status(500).json({ message: "Unable to create unit right now." });
  }
});

app.get("/tenants", authMiddleware, requireAdminOrStaff, async (_req, res) => {
  try {
    const result = await db.query<{ id: string; email: string; full_name: string }>(
      `SELECT DISTINCT u.id, u.email, u.full_name
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id AND r.code = 'tenant'
       WHERE u.is_active = true
       ORDER BY u.full_name ASC`
    );

    return res.json(
      result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name
      }))
    );
  } catch (error) {
    console.error("List tenants error:", error);
    return res.status(500).json({ message: "Unable to list tenants right now." });
  }
});

app.get("/leases", authMiddleware, async (req, res) => {
  const authUser = (req as RequestWithAuth).authUser;
  if (!authUser) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  const isAdminOrStaff = authUser.roles.some((role) => role === "admin" || role === "staff");
  const isTenant = authUser.roles.includes("tenant");
  const isOwner = authUser.roles.includes("owner");

  let filterSql = "";
  const params: string[] = [];

  if (isAdminOrStaff) {
    filterSql = "";
  } else if (isTenant) {
    params.push(authUser.sub);
    filterSql = `AND l.tenant_user_id = $${params.length}`;
  } else if (isOwner) {
    params.push(authUser.sub);
    filterSql = `AND p.owner_user_id = $${params.length}`;
  } else {
    return res.json([]);
  }

  try {
    const result = await db.query<{
      id: string;
      unit_id: string;
      property_name: string;
      unit_number: string;
      tenant_user_id: string;
      tenant_name: string;
      tenant_email: string;
      start_date: string;
      end_date: string;
      rent_amount: string;
      deposit_amount: string;
      status: string;
    }>(
      `SELECT
         l.id,
         l.unit_id,
         p.name AS property_name,
         u.unit_number,
         l.tenant_user_id,
         tenant.full_name AS tenant_name,
         tenant.email AS tenant_email,
         l.start_date,
         l.end_date,
         l.rent_amount,
         l.deposit_amount,
         l.status
       FROM leases l
       JOIN units u ON u.id = l.unit_id
       JOIN properties p ON p.id = u.property_id
       JOIN users tenant ON tenant.id = l.tenant_user_id
       WHERE 1 = 1
       ${filterSql}
       ORDER BY l.start_date DESC`,
      params
    );

    const leases: LeaseRow[] = result.rows.map((row) => ({
      id: row.id,
      unitId: row.unit_id,
      propertyName: row.property_name,
      unitNumber: row.unit_number,
      tenantUserId: row.tenant_user_id,
      tenantName: row.tenant_name,
      tenantEmail: row.tenant_email,
      startDate: row.start_date,
      endDate: row.end_date,
      rentAmount: Number(row.rent_amount),
      depositAmount: Number(row.deposit_amount),
      status: row.status
    }));

    return res.json(leases);
  } catch (error) {
    console.error("List leases error:", error);
    return res.status(500).json({ message: "Unable to list leases right now." });
  }
});

app.post("/leases", authMiddleware, requireAdminOrStaff, async (req, res) => {
  const {
    unitId,
    tenantUserId,
    startDate,
    endDate,
    rentAmount,
    depositAmount,
    status
  } = req.body as {
    unitId?: string;
    tenantUserId?: string;
    startDate?: string;
    endDate?: string;
    rentAmount?: number;
    depositAmount?: number;
    status?: string;
  };

  if (!unitId || !tenantUserId || !startDate || !endDate || rentAmount === undefined || rentAmount === null) {
    return res.status(400).json({ message: "unitId, tenantUserId, startDate, endDate, and rentAmount are required." });
  }

  const leaseStatus = status?.trim() || "active";

  try {
    const tenantCheck = await db.query<{ ok: number }>(
      `SELECT 1 AS ok
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id AND r.code = 'tenant'
       WHERE u.id = $1 AND u.is_active = true`,
      [tenantUserId]
    );

    if (tenantCheck.rowCount === 0) {
      return res.status(400).json({ message: "Tenant user not found or does not have tenant role." });
    }

    const unitCheck = await db.query<{ id: string }>(`SELECT id FROM units WHERE id = $1`, [unitId]);
    if (unitCheck.rowCount === 0) {
      return res.status(400).json({ message: "Unit not found." });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: "startDate must be on or before endDate." });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const inserted = await client.query<{
        id: string;
        unit_id: string;
        tenant_user_id: string;
        start_date: string;
        end_date: string;
        rent_amount: string;
        deposit_amount: string;
        status: string;
      }>(
        `INSERT INTO leases (unit_id, tenant_user_id, start_date, end_date, rent_amount, deposit_amount, status)
         VALUES ($1, $2, $3::date, $4::date, $5, $6, $7)
         RETURNING id, unit_id, tenant_user_id, start_date, end_date, rent_amount, deposit_amount, status`,
        [
          unitId,
          tenantUserId,
          startDate,
          endDate,
          rentAmount,
          depositAmount ?? 0,
          leaseStatus
        ]
      );

      if (leaseStatus === "active") {
        await client.query(`UPDATE units SET status = 'occupied' WHERE id = $1`, [unitId]);
      }

      await client.query("COMMIT");

      const detail = await db.query<{
        property_name: string;
        unit_number: string;
        tenant_name: string;
        tenant_email: string;
      }>(
        `SELECT p.name AS property_name, u.unit_number, tenant.full_name AS tenant_name, tenant.email AS tenant_email
         FROM leases l
         JOIN units u ON u.id = l.unit_id
         JOIN properties p ON p.id = u.property_id
         JOIN users tenant ON tenant.id = l.tenant_user_id
         WHERE l.id = $1`,
        [inserted.rows[0].id]
      );

      return res.status(201).json({
        id: inserted.rows[0].id,
        unitId: inserted.rows[0].unit_id,
        propertyName: detail.rows[0]?.property_name ?? "",
        unitNumber: detail.rows[0]?.unit_number ?? "",
        tenantUserId: inserted.rows[0].tenant_user_id,
        tenantName: detail.rows[0]?.tenant_name ?? "",
        tenantEmail: detail.rows[0]?.tenant_email ?? "",
        startDate: inserted.rows[0].start_date,
        endDate: inserted.rows[0].end_date,
        rentAmount: Number(inserted.rows[0].rent_amount),
        depositAmount: Number(inserted.rows[0].deposit_amount),
        status: inserted.rows[0].status
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create lease error:", error);
    return res.status(500).json({ message: "Unable to create lease right now." });
  }
});

app.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token is required." });
  }

  try {
    const payload = jwt.verify(refreshToken, jwtRefreshSecret) as { sub: string };
    const user = await mapUserWithRoles(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "User not found for refresh token." });
    }

    return res.json({
      accessToken: createAccessToken(user)
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return res.status(401).json({ message: "Invalid refresh token." });
  }
});

app.get("/me", async (req, res) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: "Missing bearer token." });
  }

  let payload: AccessPayload;
  try {
    payload = jwt.verify(token, jwtAccessSecret) as AccessPayload;
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token." });
  }

  try {
    const user = await mapUserWithRoles(payload.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles
    });
  } catch (error) {
    console.error("Profile lookup error:", error);
    return res.status(500).json({ message: "Unable to load profile right now." });
  }
});

const server = app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

let shuttingDown = false;
const shutdown = (signal: string) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`${signal} received, closing HTTP server and database pool...`);
  server.close(async () => {
    try {
      await db.end();
      console.log("Shutdown complete.");
      process.exit(0);
    } catch (error) {
      console.error("Shutdown error:", error);
      process.exit(1);
    }
  });
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

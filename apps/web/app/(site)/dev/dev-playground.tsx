"use client";

/** Dev-only API playground — not imported in production builds of `page.tsx`. */
import { getPublicApiBaseUrl } from "@hestia/config";
import { FormEvent, useMemo, useState } from "react";

const API_URL = getPublicApiBaseUrl();

type UserRole = "admin" | "staff" | "tenant" | "owner" | "client";

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: UserRole[];
}

interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  roles: UserRole[];
  isActive: boolean;
}

interface PropertyItem {
  id: string;
  code: string;
  name: string;
  formattedAddress: string;
  city: string;
  country: string;
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

interface TenantOption {
  id: string;
  email: string;
  fullName: string;
}

interface LeaseItem {
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

const roleGuides: Record<UserRole, string[]> = {
  admin: [
    "Manage users, permissions, and platform settings",
    "Review accounting summaries across all properties",
    "Monitor operations and SLA compliance"
  ],
  staff: [
    "View assigned maintenance tickets",
    "Update ticket status and upload completion notes",
    "Track job tasks and used inventory"
  ],
  tenant: [
    "Open maintenance tickets with issue details",
    "Track ticket progress and closure notes",
    "View lease invoices and payment status"
  ],
  owner: [
    "Review your property and unit status",
    "Track open tickets and ongoing renovation jobs",
    "View owner financial statements"
  ],
  client: [
    "Track renovation project timelines",
    "Review estimates and approve job scopes",
    "View project invoices and payments"
  ]
};

export default function DevPlayground() {
  const [email, setEmail] = useState("admin@propertyops.qa");
  const [password, setPassword] = useState("Admin123!");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRoles, setNewUserRoles] = useState<UserRole[]>(["staff"]);
  const [creatingUser, setCreatingUser] = useState(false);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [propertyCode, setPropertyCode] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [propertyZone, setPropertyZone] = useState("");
  const [propertyStreet, setPropertyStreet] = useState("");
  const [propertyBuildingNumber, setPropertyBuildingNumber] = useState("");
  const [propertyAreaName, setPropertyAreaName] = useState("");
  const [propertyCity, setPropertyCity] = useState("Doha");
  const [propertyCountry, setPropertyCountry] = useState("Qatar");
  const [creatingProperty, setCreatingProperty] = useState(false);
  const [unitPropertyId, setUnitPropertyId] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [unitType, setUnitType] = useState("Apartment");
  const [unitBedrooms, setUnitBedrooms] = useState("");
  const [unitBathrooms, setUnitBathrooms] = useState("");
  const [unitRent, setUnitRent] = useState("");
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [leases, setLeases] = useState<LeaseItem[]>([]);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [leaseLoading, setLeaseLoading] = useState(false);
  const [leaseError, setLeaseError] = useState<string | null>(null);
  const [leaseUnitId, setLeaseUnitId] = useState("");
  const [leaseTenantUserId, setLeaseTenantUserId] = useState("");
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");
  const [leaseRentAmount, setLeaseRentAmount] = useState("");
  const [leaseDeposit, setLeaseDeposit] = useState("");
  const [creatingLease, setCreatingLease] = useState(false);

  const roleCards = useMemo(() => {
    if (!user) {
      return [];
    }
    return user.roles.map((role) => ({ role, items: roleGuides[role] }));
  }, [user]);

  const isAdmin = user?.roles.includes("admin") ?? false;
  const isAdminOrStaff = user?.roles.some((r) => r === "admin" || r === "staff") ?? false;

  const toggleRole = (role: UserRole) => {
    setNewUserRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
    );
  };

  const loadUsers = async (token: string) => {
    if (!isAdmin && user) {
      return;
    }

    setUsersLoading(true);
    setUsersError(null);
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to load users.");
      }
      setUsers(data as ManagedUser[]);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadAssets = async (token: string) => {
    setAssetLoading(true);
    setAssetError(null);
    try {
      const [propertiesResponse, unitsResponse] = await Promise.all([
        fetch(`${API_URL}/properties`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/units`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const propertiesData = (await propertiesResponse.json()) as PropertyItem[] | { message?: string };
      const unitsData = (await unitsResponse.json()) as UnitItem[] | { message?: string };

      if (!propertiesResponse.ok) {
        throw new Error("message" in propertiesData ? propertiesData.message ?? "Failed to load properties." : "Failed to load properties.");
      }
      if (!unitsResponse.ok) {
        throw new Error("message" in unitsData ? unitsData.message ?? "Failed to load units." : "Failed to load units.");
      }

      const nextProperties = propertiesData as PropertyItem[];
      setProperties(nextProperties);
      setUnits(unitsData as UnitItem[]);
      if (!unitPropertyId && nextProperties[0]) {
        setUnitPropertyId(nextProperties[0].id);
      }
      const nextUnits = unitsData as UnitItem[];
      if (!leaseUnitId && nextUnits[0]) {
        setLeaseUnitId(nextUnits[0].id);
      }
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setAssetLoading(false);
    }
  };

  const loadLeases = async (token: string) => {
    setLeaseLoading(true);
    setLeaseError(null);
    try {
      const response = await fetch(`${API_URL}/leases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = (await response.json()) as LeaseItem[] | { message?: string };
      if (!response.ok) {
        throw new Error("message" in data ? data.message ?? "Failed to load leases." : "Failed to load leases.");
      }
      setLeases(data as LeaseItem[]);
    } catch (error) {
      setLeaseError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setLeaseLoading(false);
    }
  };

  const loadTenantOptions = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = (await response.json()) as TenantOption[] | { message?: string };
      if (!response.ok) {
        throw new Error("message" in data ? data.message ?? "Failed to load tenants." : "Failed to load tenants.");
      }
      const list = data as TenantOption[];
      setTenantOptions(list);
      if (!leaseTenantUserId && list[0]) {
        setLeaseTenantUserId(list[0].id);
      }
    } catch (error) {
      setLeaseError(error instanceof Error ? error.message : "Unexpected error.");
    }
  };

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const loginResponse = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!loginResponse.ok) {
        const loginError = (await loginResponse.json()) as { message?: string };
        throw new Error(loginError.message ?? "Unable to login.");
      }

      const loginData = (await loginResponse.json()) as {
        accessToken: string;
        refreshToken: string;
      };

      setAccessToken(loginData.accessToken);
      setRefreshToken(loginData.refreshToken);

      const meResponse = await fetch(`${API_URL}/me`, {
        headers: {
          Authorization: `Bearer ${loginData.accessToken}`
        }
      });

      if (!meResponse.ok) {
        throw new Error("Login succeeded but failed to load profile.");
      }

      const meData = (await meResponse.json()) as AuthUser;
      setUser(meData);
      if (meData.roles.includes("admin")) {
        await loadUsers(loginData.accessToken);
      }
      if (meData.roles.includes("admin") || meData.roles.includes("staff")) {
        await loadAssets(loginData.accessToken);
        await loadTenantOptions(loginData.accessToken);
      }
      await loadLeases(loginData.accessToken);
    } catch (error) {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setUsers([]);
    setProperties([]);
    setUnits([]);
    setLeases([]);
    setTenantOptions([]);
  };

  const onCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    if (newUserRoles.length === 0) {
      setUsersError("Please select at least one role.");
      return;
    }

    setCreatingUser(true);
    setUsersError(null);
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: newUserEmail,
          fullName: newUserName,
          password: newUserPassword,
          roles: newUserRoles
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to create user.");
      }

      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserRoles(["staff"]);
      await loadUsers(accessToken);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setCreatingUser(false);
    }
  };

  const onCreateProperty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    if (!propertyCode || !propertyName || !propertyZone || !propertyStreet || !propertyBuildingNumber || !propertyCity) {
      setAssetError("Fill property code, name, zone, street, building number, and city.");
      return;
    }

    setCreatingProperty(true);
    setAssetError(null);
    try {
      const response = await fetch(`${API_URL}/properties`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code: propertyCode,
          name: propertyName,
          addressZone: propertyZone,
          addressStreet: propertyStreet,
          addressBuildingNumber: propertyBuildingNumber,
          addressAreaName: propertyAreaName.trim() || undefined,
          city: propertyCity,
          country: propertyCountry
        })
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Unable to create property.");
      }

      setPropertyCode("");
      setPropertyName("");
      setPropertyZone("");
      setPropertyStreet("");
      setPropertyBuildingNumber("");
      setPropertyAreaName("");
      await loadAssets(accessToken);
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setCreatingProperty(false);
    }
  };

  const onCreateUnit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }

    setCreatingUnit(true);
    setAssetError(null);
    try {
      const response = await fetch(`${API_URL}/units`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          propertyId: unitPropertyId,
          unitNumber,
          unitType,
          bedrooms: unitBedrooms ? Number(unitBedrooms) : null,
          bathrooms: unitBathrooms ? Number(unitBathrooms) : null,
          monthlyRent: unitRent ? Number(unitRent) : null
        })
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Unable to create unit.");
      }

      setUnitNumber("");
      setUnitBedrooms("");
      setUnitBathrooms("");
      setUnitRent("");
      await loadAssets(accessToken);
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setCreatingUnit(false);
    }
  };

  const onCreateLease = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }

    setCreatingLease(true);
    setLeaseError(null);
    try {
      const response = await fetch(`${API_URL}/leases`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          unitId: leaseUnitId,
          tenantUserId: leaseTenantUserId,
          startDate: leaseStart,
          endDate: leaseEnd,
          rentAmount: Number(leaseRentAmount),
          depositAmount: leaseDeposit ? Number(leaseDeposit) : 0,
          status: "active"
        })
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Unable to create lease.");
      }

      setLeaseStart("");
      setLeaseEnd("");
      setLeaseRentAmount("");
      setLeaseDeposit("");
      await Promise.all([loadLeases(accessToken), loadAssets(accessToken)]);
    } catch (error) {
      setLeaseError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setCreatingLease(false);
    }
  };

  return (
    <main>
      <h1>Hestia Portal — API dev playground</h1>
      <p>Local login and CRUD test against the Express API. Production UIs use routes under /tenant, /admin, etc.</p>

      {!user ? (
        <section className="card">
          <h2>Login</h2>
          <form onSubmit={onLogin}>
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </label>
            <label>
              Password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p>
            Start with admin seed user: <code>admin@propertyops.qa</code> / <code>Admin123!</code>
          </p>
          {errorMessage ? <p className="error">{errorMessage}</p> : null}
        </section>
      ) : (
        <>
          <section className="card">
            <h2>Welcome, {user.fullName}</h2>
            <p>Email: {user.email}</p>
            <p>Roles: {user.roles.join(", ")}</p>
            <button onClick={onLogout}>Logout</button>
          </section>

          {roleCards.map((card) => (
            <section className="card" key={card.role}>
              <h3>{card.role.toUpperCase()} Dashboard Focus</h3>
              <ul>
                {card.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}

          <section className="card">
            <h3>Session Tokens</h3>
            <p>Access token: {accessToken ? "Issued" : "Missing"}</p>
            <p>Refresh token: {refreshToken ? "Issued" : "Missing"}</p>
          </section>

          {isAdmin ? (
            <>
              <section className="card">
                <h3>Create User</h3>
                <form onSubmit={onCreateUser}>
                  <label>
                    Full name
                    <input
                      value={newUserName}
                      onChange={(event) => setNewUserName(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(event) => setNewUserEmail(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Temporary password
                    <input
                      type="text"
                      value={newUserPassword}
                      onChange={(event) => setNewUserPassword(event.target.value)}
                      required
                    />
                  </label>
                  <div>
                    <p>Roles</p>
                    <div className="role-grid">
                      {(["admin", "staff", "tenant", "owner", "client"] as UserRole[]).map((role) => (
                        <label key={role} className="role-option">
                          <input
                            type="checkbox"
                            checked={newUserRoles.includes(role)}
                            onChange={() => toggleRole(role)}
                          />
                          <span>{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button type="submit" disabled={creatingUser}>
                    {creatingUser ? "Creating..." : "Create user"}
                  </button>
                </form>
                {usersError ? <p className="error">{usersError}</p> : null}
              </section>

              <section className="card">
                <h3>Users</h3>
                {usersLoading ? <p>Loading users...</p> : null}
                {!usersLoading && users.length === 0 ? <p>No users yet.</p> : null}
                {!usersLoading && users.length > 0 ? (
                  <ul>
                    {users.map((managedUser) => (
                      <li key={managedUser.id}>
                        {managedUser.fullName} ({managedUser.email}) - {managedUser.roles.join(", ")}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <section className="card">
                <h3>Create Property</h3>
                <form onSubmit={onCreateProperty}>
                  <label>
                    Property code
                    <input value={propertyCode} onChange={(event) => setPropertyCode(event.target.value)} required />
                  </label>
                  <label>
                    Property name
                    <input value={propertyName} onChange={(event) => setPropertyName(event.target.value)} required />
                  </label>
                  <label>
                    Zone
                    <input value={propertyZone} onChange={(event) => setPropertyZone(event.target.value)} required />
                  </label>
                  <label>
                    Street
                    <input value={propertyStreet} onChange={(event) => setPropertyStreet(event.target.value)} required />
                  </label>
                  <label>
                    Building number
                    <input
                      value={propertyBuildingNumber}
                      onChange={(event) => setPropertyBuildingNumber(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Area (optional)
                    <input value={propertyAreaName} onChange={(event) => setPropertyAreaName(event.target.value)} />
                  </label>
                  <label>
                    City
                    <input value={propertyCity} onChange={(event) => setPropertyCity(event.target.value)} required />
                  </label>
                  <label>
                    Country
                    <input value={propertyCountry} onChange={(event) => setPropertyCountry(event.target.value)} required />
                  </label>
                  <button type="submit" disabled={creatingProperty}>
                    {creatingProperty ? "Creating..." : "Create property"}
                  </button>
                </form>
              </section>

              <section className="card">
                <h3>Create Unit</h3>
                <form onSubmit={onCreateUnit}>
                  <label>
                    Property
                    <select value={unitPropertyId} onChange={(event) => setUnitPropertyId(event.target.value)} required>
                      <option value="">Select property</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name} ({property.code})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Unit number
                    <input value={unitNumber} onChange={(event) => setUnitNumber(event.target.value)} required />
                  </label>
                  <label>
                    Unit type
                    <input value={unitType} onChange={(event) => setUnitType(event.target.value)} />
                  </label>
                  <label>
                    Bedrooms
                    <input
                      type="number"
                      value={unitBedrooms}
                      onChange={(event) => setUnitBedrooms(event.target.value)}
                    />
                  </label>
                  <label>
                    Bathrooms
                    <input
                      type="number"
                      value={unitBathrooms}
                      onChange={(event) => setUnitBathrooms(event.target.value)}
                    />
                  </label>
                  <label>
                    Monthly rent
                    <input type="number" value={unitRent} onChange={(event) => setUnitRent(event.target.value)} />
                  </label>
                  <button type="submit" disabled={creatingUnit}>
                    {creatingUnit ? "Creating..." : "Create unit"}
                  </button>
                </form>
              </section>
            </>
          ) : null}

          {user && isAdminOrStaff ? (
            <section className="card">
              <h3>Create lease</h3>
              <p className="hint">Assign a tenant to a unit with start and end dates.</p>
              <form onSubmit={onCreateLease}>
                <label>
                  Unit
                  <select value={leaseUnitId} onChange={(event) => setLeaseUnitId(event.target.value)} required>
                    <option value="">Select unit</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.propertyName} — Unit {unit.unitNumber}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tenant
                  <select
                    value={leaseTenantUserId}
                    onChange={(event) => setLeaseTenantUserId(event.target.value)}
                    required
                  >
                    <option value="">Select tenant</option>
                    {tenantOptions.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.fullName} ({tenant.email})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Start date
                  <input type="date" value={leaseStart} onChange={(event) => setLeaseStart(event.target.value)} required />
                </label>
                <label>
                  End date
                  <input type="date" value={leaseEnd} onChange={(event) => setLeaseEnd(event.target.value)} required />
                </label>
                <label>
                  Monthly rent
                  <input
                    type="number"
                    value={leaseRentAmount}
                    onChange={(event) => setLeaseRentAmount(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Security deposit (optional)
                  <input type="number" value={leaseDeposit} onChange={(event) => setLeaseDeposit(event.target.value)} />
                </label>
                <button type="submit" disabled={creatingLease || units.length === 0 || tenantOptions.length === 0}>
                  {creatingLease ? "Creating..." : "Create lease"}
                </button>
              </form>
              {leaseError ? <p className="error">{leaseError}</p> : null}
            </section>
          ) : null}

          {user && (isAdmin || user.roles.includes("staff")) ? (
            <>
              <section className="card">
                <h3>
                  Properties{" "}
                  <button type="button" onClick={() => accessToken && loadAssets(accessToken)} disabled={assetLoading}>
                    Refresh
                  </button>
                </h3>
                {assetError ? <p className="error">{assetError}</p> : null}
                {assetLoading ? <p>Loading assets...</p> : null}
                {!assetLoading && properties.length === 0 ? <p>No properties yet.</p> : null}
                {!assetLoading && properties.length > 0 ? (
                  <ul>
                    {properties.map((property) => (
                      <li key={property.id}>
                        {property.name} ({property.code}) — {property.formattedAddress}, {property.country}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <section className="card">
                <h3>Units</h3>
                {!assetLoading && units.length === 0 ? <p>No units yet.</p> : null}
                {!assetLoading && units.length > 0 ? (
                  <ul>
                    {units.map((unit) => (
                      <li key={unit.id}>
                        {unit.propertyName} - Unit {unit.unitNumber} ({unit.unitType ?? "n/a"}) | Rent:{" "}
                        {unit.monthlyRent ?? 0} | Status: {unit.status}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            </>
          ) : null}

          {user &&
          (isAdmin || user.roles.includes("staff") || user.roles.includes("tenant") || user.roles.includes("owner")) ? (
            <section className="card">
              <h3>
                Leases{" "}
                <button type="button" onClick={() => accessToken && loadLeases(accessToken)} disabled={leaseLoading}>
                  Refresh
                </button>
              </h3>
              {leaseLoading ? <p>Loading leases...</p> : null}
              {!leaseLoading && leases.length === 0 ? <p>No leases to show.</p> : null}
              {!leaseLoading && leases.length > 0 ? (
                <ul>
                  {leases.map((lease) => (
                    <li key={lease.id}>
                      {lease.propertyName} — Unit {lease.unitNumber}: {lease.tenantName} ({lease.tenantEmail}) |{" "}
                      {lease.startDate} → {lease.endDate} | QAR {lease.rentAmount}/mo | {lease.status}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}

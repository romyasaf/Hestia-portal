import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

const AVAILABLE_ROLES = ["admin", "staff", "tenant", "owner", "client"];

export default function App() {
  const [apiUrl, setApiUrl] = useState("http://localhost:4000");
  const [email, setEmail] = useState("admin@propertyops.qa");
  const [password, setPassword] = useState("Admin123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRoles, setNewUserRoles] = useState(["staff"]);
  const [creatingUser, setCreatingUser] = useState(false);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState("");
  const [propertyCode, setPropertyCode] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [propertyZone, setPropertyZone] = useState("");
  const [propertyStreet, setPropertyStreet] = useState("");
  const [propertyBuildingNumber, setPropertyBuildingNumber] = useState("");
  const [propertyAreaName, setPropertyAreaName] = useState("");
  const [propertyCity, setPropertyCity] = useState("Doha");
  const [creatingProperty, setCreatingProperty] = useState(false);
  const [unitPropertyId, setUnitPropertyId] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [unitType, setUnitType] = useState("Apartment");
  const [unitRent, setUnitRent] = useState("");
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [leases, setLeases] = useState([]);
  const [tenantPick, setTenantPick] = useState([]);
  const [leaseLoading, setLeaseLoading] = useState(false);
  const [leaseError, setLeaseError] = useState("");
  const [leaseUnitId, setLeaseUnitId] = useState("");
  const [leaseTenantId, setLeaseTenantId] = useState("");
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");
  const [leaseRent, setLeaseRent] = useState("");
  const [leaseDeposit, setLeaseDeposit] = useState("");
  const [creatingLease, setCreatingLease] = useState(false);

  const roleLabel = useMemo(() => {
    if (!session?.user?.roles?.length) {
      return "";
    }
    return session.user.roles.join(", ");
  }, [session]);

  const isAdmin = !!session?.user?.roles?.includes("admin");
  const isStaff = !!session?.user?.roles?.includes("staff");

  const loadUsers = async (token) => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const response = await fetch(`${apiUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load users");
      }
      setUsers(data);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadAssets = async (token) => {
    setAssetsLoading(true);
    setAssetsError("");
    try {
      const [propertiesRes, unitsRes] = await Promise.all([
        fetch(`${apiUrl}/properties`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/units`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const propertiesData = await propertiesRes.json();
      const unitsData = await unitsRes.json();

      if (!propertiesRes.ok) {
        throw new Error(propertiesData?.message || "Unable to load properties");
      }
      if (!unitsRes.ok) {
        throw new Error(unitsData?.message || "Unable to load units");
      }

      setProperties(propertiesData);
      setUnits(unitsData);
      if (!unitPropertyId && propertiesData.length > 0) {
        setUnitPropertyId(propertiesData[0].id);
      }
      if (!leaseUnitId && unitsData.length > 0) {
        setLeaseUnitId(unitsData[0].id);
      }
    } catch (err) {
      setAssetsError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setAssetsLoading(false);
    }
  };

  const toggleRole = (role) => {
    setNewUserRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
    );
  };

  const createUser = async () => {
    if (!session?.accessToken) {
      return;
    }
    if (!newUserName || !newUserEmail || !newUserPassword || newUserRoles.length === 0) {
      setUsersError("Fill all fields and select at least one role.");
      return;
    }

    setCreatingUser(true);
    setUsersError("");
    try {
      const response = await fetch(`${apiUrl}/users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          roles: newUserRoles
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Could not create user");
      }

      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRoles(["staff"]);
      await loadUsers(session.accessToken);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setCreatingUser(false);
    }
  };

  const createProperty = async () => {
    if (!session?.accessToken) {
      return;
    }
    if (!propertyCode || !propertyName || !propertyZone || !propertyStreet || !propertyBuildingNumber || !propertyCity) {
      setAssetsError("Fill property code, name, zone, street, building number, and city.");
      return;
    }

    setCreatingProperty(true);
    setAssetsError("");
    try {
      const response = await fetch(`${apiUrl}/properties`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
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
          country: "Qatar"
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Could not create property");
      }

      setPropertyCode("");
      setPropertyName("");
      setPropertyZone("");
      setPropertyStreet("");
      setPropertyBuildingNumber("");
      setPropertyAreaName("");
      await loadAssets(session.accessToken);
    } catch (err) {
      setAssetsError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setCreatingProperty(false);
    }
  };

  const createUnit = async () => {
    if (!session?.accessToken) {
      return;
    }
    if (!unitPropertyId || !unitNumber) {
      setAssetsError("Select property and unit number.");
      return;
    }

    setCreatingUnit(true);
    setAssetsError("");
    try {
      const response = await fetch(`${apiUrl}/units`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          propertyId: unitPropertyId,
          unitNumber,
          unitType,
          monthlyRent: unitRent ? Number(unitRent) : null
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Could not create unit");
      }

      setUnitNumber("");
      setUnitRent("");
      await loadAssets(session.accessToken);
    } catch (err) {
      setAssetsError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setCreatingUnit(false);
    }
  };

  const loadLeases = async (token) => {
    setLeaseLoading(true);
    setLeaseError("");
    try {
      const res = await fetch(`${apiUrl}/leases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Unable to load leases");
      }
      setLeases(data);
    } catch (err) {
      setLeaseError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLeaseLoading(false);
    }
  };

  const loadTenantPick = async (token) => {
    try {
      const res = await fetch(`${apiUrl}/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Unable to load tenants");
      }
      setTenantPick(data);
      if (!leaseTenantId && data.length > 0) {
        setLeaseTenantId(data[0].id);
      }
    } catch (err) {
      setLeaseError(err instanceof Error ? err.message : "Unexpected error");
    }
  };

  const createLease = async () => {
    if (!session?.accessToken) {
      return;
    }
    if (!leaseUnitId || !leaseTenantId || !leaseStart || !leaseEnd || !leaseRent) {
      setLeaseError("Fill unit, tenant, dates, and rent.");
      return;
    }
    setCreatingLease(true);
    setLeaseError("");
    try {
      const res = await fetch(`${apiUrl}/leases`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          unitId: leaseUnitId,
          tenantUserId: leaseTenantId,
          startDate: leaseStart,
          endDate: leaseEnd,
          rentAmount: Number(leaseRent),
          depositAmount: leaseDeposit ? Number(leaseDeposit) : 0,
          status: "active"
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Could not create lease");
      }
      setLeaseStart("");
      setLeaseEnd("");
      setLeaseRent("");
      setLeaseDeposit("");
      await Promise.all([loadLeases(session.accessToken), loadAssets(session.accessToken)]);
    } catch (err) {
      setLeaseError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setCreatingLease(false);
    }
  };

  const signIn = async () => {
    setLoading(true);
    setError("");
    try {
      const loginRes = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(loginData?.message || "Login failed");
      }

      const meRes = await fetch(`${apiUrl}/me`, {
        headers: { Authorization: `Bearer ${loginData.accessToken}` }
      });
      const meData = await meRes.json();
      if (!meRes.ok) {
        throw new Error(meData?.message || "Could not load profile");
      }

      const nextSession = {
        accessToken: loginData.accessToken,
        refreshToken: loginData.refreshToken,
        user: meData
      };
      setSession(nextSession);

      const roles = meData?.roles || [];
      if (roles.includes("admin")) {
        await loadUsers(loginData.accessToken);
        await loadAssets(loginData.accessToken);
        await loadTenantPick(loginData.accessToken);
      } else if (roles.includes("staff")) {
        await loadAssets(loginData.accessToken);
        await loadTenantPick(loginData.accessToken);
      }
      if (roles.some((r) => ["admin", "staff", "tenant", "owner"].includes(r))) {
        await loadLeases(loginData.accessToken);
      }
    } catch (err) {
      setSession(null);
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setSession(null);
    setUsers([]);
    setUsersError("");
    setProperties([]);
    setUnits([]);
    setAssetsError("");
    setLeases([]);
    setTenantPick([]);
    setLeaseError("");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Property Ops Mobile</Text>
        <Text style={styles.subtitle}>Login starter for tenant/staff/admin.</Text>

        {!session ? (
          <View style={styles.card}>
            <Text style={styles.label}>API URL</Text>
            <TextInput
              style={styles.input}
              value={apiUrl}
              onChangeText={setApiUrl}
              autoCapitalize="none"
            />
            <Text style={styles.hint}>
              If testing on your phone, replace localhost with your Mac IP.
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.button} onPress={signIn} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
            </TouchableOpacity>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.hint}>Demo: admin@propertyops.qa / Admin123!</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.welcome}>Welcome, {session.user.fullName}</Text>
              <Text style={styles.meta}>Email: {session.user.email}</Text>
              <Text style={styles.meta}>Roles: {roleLabel}</Text>
              <TouchableOpacity style={styles.button} onPress={logout}>
                <Text style={styles.buttonText}>Logout</Text>
              </TouchableOpacity>
            </View>

            {isAdmin ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Admin Workflow: Create User</Text>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput style={styles.input} value={newUserName} onChangeText={setNewUserName} />

                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={newUserEmail}
                    onChangeText={setNewUserEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  <Text style={styles.label}>Temporary Password</Text>
                  <TextInput
                    style={styles.input}
                    value={newUserPassword}
                    onChangeText={setNewUserPassword}
                    autoCapitalize="none"
                  />

                  <Text style={styles.label}>Roles</Text>
                  <View style={styles.rolesRow}>
                    {AVAILABLE_ROLES.map((role) => {
                      const active = newUserRoles.includes(role);
                      return (
                        <TouchableOpacity
                          key={role}
                          style={[styles.roleChip, active ? styles.roleChipActive : null]}
                          onPress={() => toggleRole(role)}
                        >
                          <Text style={active ? styles.roleChipTextActive : styles.roleChipText}>{role}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity style={styles.button} onPress={createUser} disabled={creatingUser}>
                    {creatingUser ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Create User</Text>
                    )}
                  </TouchableOpacity>
                  {usersError ? <Text style={styles.error}>{usersError}</Text> : null}
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Create Property</Text>
                  <Text style={styles.label}>Code</Text>
                  <TextInput style={styles.input} value={propertyCode} onChangeText={setPropertyCode} />
                  <Text style={styles.label}>Name</Text>
                  <TextInput style={styles.input} value={propertyName} onChangeText={setPropertyName} />
                  <Text style={styles.label}>Zone</Text>
                  <TextInput style={styles.input} value={propertyZone} onChangeText={setPropertyZone} />
                  <Text style={styles.label}>Street</Text>
                  <TextInput style={styles.input} value={propertyStreet} onChangeText={setPropertyStreet} />
                  <Text style={styles.label}>Building number</Text>
                  <TextInput
                    style={styles.input}
                    value={propertyBuildingNumber}
                    onChangeText={setPropertyBuildingNumber}
                  />
                  <Text style={styles.label}>Area (optional)</Text>
                  <TextInput style={styles.input} value={propertyAreaName} onChangeText={setPropertyAreaName} />
                  <Text style={styles.label}>City</Text>
                  <TextInput style={styles.input} value={propertyCity} onChangeText={setPropertyCity} />
                  <TouchableOpacity style={styles.button} onPress={createProperty} disabled={creatingProperty}>
                    {creatingProperty ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Create Property</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Create Unit</Text>
                  <Text style={styles.label}>Property ID</Text>
                  <TextInput
                    style={styles.input}
                    value={unitPropertyId}
                    onChangeText={setUnitPropertyId}
                    placeholder="Paste property id from list below"
                  />
                  <Text style={styles.label}>Unit Number</Text>
                  <TextInput style={styles.input} value={unitNumber} onChangeText={setUnitNumber} />
                  <Text style={styles.label}>Unit Type</Text>
                  <TextInput style={styles.input} value={unitType} onChangeText={setUnitType} />
                  <Text style={styles.label}>Monthly Rent</Text>
                  <TextInput
                    style={styles.input}
                    value={unitRent}
                    onChangeText={setUnitRent}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity style={styles.button} onPress={createUnit} disabled={creatingUnit}>
                    {creatingUnit ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Unit</Text>}
                  </TouchableOpacity>
                  {assetsError ? <Text style={styles.error}>{assetsError}</Text> : null}
                </View>

                <View style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Users</Text>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => loadUsers(session.accessToken)}
                      disabled={usersLoading}
                    >
                      <Text style={styles.secondaryButtonText}>Refresh</Text>
                    </TouchableOpacity>
                  </View>
                  {usersLoading ? <Text style={styles.meta}>Loading users...</Text> : null}
                  {!usersLoading && users.length === 0 ? <Text style={styles.meta}>No users found.</Text> : null}
                  {!usersLoading &&
                    users.map((item) => (
                      <View key={item.id} style={styles.userItem}>
                        <Text style={styles.userName}>{item.fullName}</Text>
                        <Text style={styles.userMeta}>{item.email}</Text>
                        <Text style={styles.userMeta}>Roles: {item.roles.join(", ") || "none"}</Text>
                      </View>
                    ))}
                </View>

                <View style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Properties</Text>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => loadAssets(session.accessToken)}
                      disabled={assetsLoading}
                    >
                      <Text style={styles.secondaryButtonText}>Refresh</Text>
                    </TouchableOpacity>
                  </View>
                  {assetsLoading ? <Text style={styles.meta}>Loading assets...</Text> : null}
                  {!assetsLoading &&
                    properties.map((item) => (
                      <View key={item.id} style={styles.userItem}>
                        <Text style={styles.userName}>
                          {item.name} ({item.code})
                        </Text>
                        <Text style={styles.userMeta}>{item.id}</Text>
                        <Text style={styles.userMeta}>
                          {item.formattedAddress ? `${item.formattedAddress}, ${item.country}` : `${item.city}, ${item.country}`}
                        </Text>
                      </View>
                    ))}
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Units</Text>
                  {!assetsLoading &&
                    units.map((item) => (
                      <View key={item.id} style={styles.userItem}>
                        <Text style={styles.userName}>
                          {item.propertyName} - Unit {item.unitNumber}
                        </Text>
                        <Text style={styles.userMeta}>Type: {item.unitType || "n/a"}</Text>
                        <Text style={styles.userMeta}>Rent: {item.monthlyRent || 0}</Text>
                        <Text style={styles.userMeta}>id: {item.id}</Text>
                      </View>
                    ))}
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Create lease</Text>
                  <Text style={styles.label}>Unit id</Text>
                  <TextInput style={styles.input} value={leaseUnitId} onChangeText={setLeaseUnitId} />
                  <Text style={styles.label}>Tenant user id</Text>
                  <TextInput style={styles.input} value={leaseTenantId} onChangeText={setLeaseTenantId} />
                  <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
                  <TextInput style={styles.input} value={leaseStart} onChangeText={setLeaseStart} />
                  <Text style={styles.label}>End date (YYYY-MM-DD)</Text>
                  <TextInput style={styles.input} value={leaseEnd} onChangeText={setLeaseEnd} />
                  <Text style={styles.label}>Monthly rent</Text>
                  <TextInput style={styles.input} value={leaseRent} onChangeText={setLeaseRent} keyboardType="numeric" />
                  <Text style={styles.label}>Deposit (optional)</Text>
                  <TextInput style={styles.input} value={leaseDeposit} onChangeText={setLeaseDeposit} keyboardType="numeric" />
                  <TouchableOpacity style={styles.button} onPress={createLease} disabled={creatingLease}>
                    {creatingLease ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create lease</Text>}
                  </TouchableOpacity>
                  {leaseError ? <Text style={styles.error}>{leaseError}</Text> : null}
                </View>

                <View style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Leases</Text>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => loadLeases(session.accessToken)}
                      disabled={leaseLoading}
                    >
                      <Text style={styles.secondaryButtonText}>Refresh</Text>
                    </TouchableOpacity>
                  </View>
                  {leaseLoading ? <Text style={styles.meta}>Loading...</Text> : null}
                  {!leaseLoading && leases.length === 0 ? <Text style={styles.meta}>No leases.</Text> : null}
                  {!leaseLoading &&
                    leases.map((l) => (
                      <View key={l.id} style={styles.userItem}>
                        <Text style={styles.userName}>
                          {l.propertyName} — {l.unitNumber}
                        </Text>
                        <Text style={styles.userMeta}>
                          {l.tenantName} | {l.startDate} → {l.endDate} | {l.rentAmount} | {l.status}
                        </Text>
                      </View>
                    ))}
                </View>
              </>
            ) : null}

            {isStaff && !isAdmin ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Staff: Create lease</Text>
                  <Text style={styles.hint}>Use unit id and tenant id from lists below.</Text>
                  <Text style={styles.label}>Unit id</Text>
                  <TextInput style={styles.input} value={leaseUnitId} onChangeText={setLeaseUnitId} />
                  <Text style={styles.label}>Tenant user id</Text>
                  <TextInput style={styles.input} value={leaseTenantId} onChangeText={setLeaseTenantId} />
                  <Text style={styles.label}>Start (YYYY-MM-DD)</Text>
                  <TextInput style={styles.input} value={leaseStart} onChangeText={setLeaseStart} />
                  <Text style={styles.label}>End (YYYY-MM-DD)</Text>
                  <TextInput style={styles.input} value={leaseEnd} onChangeText={setLeaseEnd} />
                  <Text style={styles.label}>Rent</Text>
                  <TextInput style={styles.input} value={leaseRent} onChangeText={setLeaseRent} keyboardType="numeric" />
                  <TouchableOpacity style={styles.button} onPress={createLease} disabled={creatingLease}>
                    {creatingLease ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create lease</Text>}
                  </TouchableOpacity>
                  {leaseError ? <Text style={styles.error}>{leaseError}</Text> : null}
                </View>

                <View style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Units</Text>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => loadAssets(session.accessToken)}
                      disabled={assetsLoading}
                    >
                      <Text style={styles.secondaryButtonText}>Refresh</Text>
                    </TouchableOpacity>
                  </View>
                  {!assetsLoading &&
                    units.map((item) => (
                      <View key={item.id} style={styles.userItem}>
                        <Text style={styles.userName}>
                          {item.propertyName} - Unit {item.unitNumber}
                        </Text>
                        <Text style={styles.userMeta}>id: {item.id}</Text>
                      </View>
                    ))}
                </View>

                <View style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Tenants</Text>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => loadTenantPick(session.accessToken)}
                    >
                      <Text style={styles.secondaryButtonText}>Refresh</Text>
                    </TouchableOpacity>
                  </View>
                  {tenantPick.map((t) => (
                    <View key={t.id} style={styles.userItem}>
                      <Text style={styles.userName}>{t.fullName}</Text>
                      <Text style={styles.userMeta}>id: {t.id}</Text>
                      <Text style={styles.userMeta}>{t.email}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Leases</Text>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => loadLeases(session.accessToken)}
                      disabled={leaseLoading}
                    >
                      <Text style={styles.secondaryButtonText}>Refresh</Text>
                    </TouchableOpacity>
                  </View>
                  {!leaseLoading &&
                    leases.map((l) => (
                      <View key={l.id} style={styles.userItem}>
                        <Text style={styles.userName}>
                          {l.propertyName} — {l.unitNumber}
                        </Text>
                        <Text style={styles.userMeta}>
                          {l.tenantName} | {l.startDate} → {l.endDate} | {l.rentAmount}
                        </Text>
                      </View>
                    ))}
                </View>
              </>
            ) : null}

            {session?.user?.roles?.includes("tenant") || session?.user?.roles?.includes("owner") ? (
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionTitle}>My leases</Text>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => loadLeases(session.accessToken)}
                    disabled={leaseLoading}
                  >
                    <Text style={styles.secondaryButtonText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
                {leaseLoading ? <Text style={styles.meta}>Loading...</Text> : null}
                {!leaseLoading && leases.length === 0 ? <Text style={styles.meta}>No leases.</Text> : null}
                {!leaseLoading &&
                  leases.map((l) => (
                    <View key={l.id} style={styles.userItem}>
                      <Text style={styles.userName}>
                        {l.propertyName} — Unit {l.unitNumber}
                      </Text>
                      <Text style={styles.userMeta}>
                        {l.startDate} → {l.endDate} | Rent {l.rentAmount} | {l.status}
                      </Text>
                    </View>
                  ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f7fb"
  },
  container: {
    paddingVertical: 28,
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    color: "#4b5563"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderColor: "#e5e7eb",
    borderWidth: 1
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: "#fff"
  },
  button: {
    marginTop: 4,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700"
  },
  hint: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 10
  },
  error: {
    marginTop: 10,
    color: "#b91c1c",
    fontWeight: "600"
  },
  welcome: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8
  },
  meta: {
    color: "#374151",
    marginBottom: 6
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10
  },
  rolesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10
  },
  roleChip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  roleChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb"
  },
  roleChipText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 12
  },
  roleChipTextActive: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontWeight: "700"
  },
  userItem: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    marginTop: 10
  },
  userName: {
    fontWeight: "700",
    marginBottom: 2
  },
  userMeta: {
    color: "#4b5563"
  }
});

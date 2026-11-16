/** Shared schema for per-truck profiles, used by the desktop companion and in-cabin runtime. */
export interface VehicleIdentity {
  modelId: string
  brandId: string
  brand: string
  model: string
  fingerprint: string | null
}

export interface ProfileAppearance {
  /** Named visual preset; "electric" is the CabinOS default. */
  theme: string
  /** Optional per-truck appearance mode. */
  mode?: 'auto' | 'dark' | 'light'
  wallpaper: string | null
  /** Optional custom icon set and icon rendering style. */
  iconSet?: string | null
  iconStyle?: 'auto' | 'light' | 'dark'
  accentColor: string
}

export interface TruckProfile {
  schemaVersion: number
  id: string
  name: string
  vehicle: VehicleIdentity | null
  appearance: ProfileAppearance
  applications: unknown[]
  shortcuts: unknown[]
  layout: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

export function isTruckProfile(value: unknown): value is TruckProfile {
  if (typeof value !== 'object' || value === null) return false
  const profile = value as Partial<TruckProfile>
  return typeof profile.id === 'string' &&
    typeof profile.name === 'string' &&
    typeof profile.appearance === 'object' && profile.appearance !== null &&
    Array.isArray(profile.applications) && Array.isArray(profile.shortcuts) &&
    typeof profile.layout === 'object' && profile.layout !== null
}
/** A profile matches only when both sides have the same confident vehicle fingerprint. */
export function matchesVehicle(profile: TruckProfile, vehicle: VehicleIdentity): boolean {
  const assigned = profile.vehicle
  return Boolean(assigned?.fingerprint && vehicle.fingerprint && assigned.fingerprint === vehicle.fingerprint)
}

/** Automatic activation is permitted only when exactly one custom profile matches. */
export function profileForVehicle(profiles: TruckProfile[], vehicle: VehicleIdentity): TruckProfile | null {
  const matches = profiles.filter((profile) => profile.id !== 'default' && matchesVehicle(profile, vehicle))
  return matches.length === 1 ? matches[0] : null
}

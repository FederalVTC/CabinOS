import { call } from './bridge'

import type { TruckProfile, VehicleIdentity } from '../shared/profiles'
export type { TruckProfile, VehicleIdentity, ProfileAppearance } from '../shared/profiles'

export const profilesList = () => call<TruckProfile[]>('profiles_list')
export const profilesCreate = (name: string, vehicle: VehicleIdentity | null) =>
  call<TruckProfile>('profiles_create', { name, vehicle })
export const profilesUpdate = (profile: TruckProfile) =>
  call<TruckProfile>('profiles_update', { profile })
export const profilesDelete = (id: string) => call<void>('profiles_delete', { id })
export const profilesAssign = (id: string, vehicle: VehicleIdentity) =>
  call<TruckProfile>('profiles_assign', { id, vehicle })

export function vehicleIdentity(truck: {
  id: string
  brandId: string
  brand: string
  name: string
  fingerprint: string | null
}): VehicleIdentity {
  return {
    modelId: truck.id,
    brandId: truck.brandId,
    brand: truck.brand,
    model: truck.name,
    fingerprint: truck.fingerprint,
  }
}

/** A vehicle is matched by its unique local fingerprint whenever both sides have one. */
export function matchesVehicle(profile: TruckProfile, vehicle: VehicleIdentity): boolean {
  const assigned = profile.vehicle
  if (!assigned) return false
  // If either side has a fingerprint, both must have it: falling back here could silently
  // match two physical trucks that share the same model.
  if (vehicle.fingerprint || assigned.fingerprint) {
    return Boolean(vehicle.fingerprint && assigned.fingerprint && vehicle.fingerprint === assigned.fingerprint)
  }
  return vehicle.modelId === assigned.modelId && vehicle.brandId === assigned.brandId
}

/** Only return an automatic match when exactly one custom profile identifies this truck. */
export function profileForVehicle(
  profiles: TruckProfile[],
  vehicle: VehicleIdentity,
): TruckProfile | null {
  const matches = profiles.filter((profile) => profile.id !== 'default' && matchesVehicle(profile, vehicle))
  return matches.length === 1 ? matches[0] : null
}

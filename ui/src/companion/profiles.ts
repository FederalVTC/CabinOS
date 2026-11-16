import { call } from './bridge'

import type { TruckProfile, VehicleIdentity } from '../shared/profiles'
export { matchesVehicle, profileForVehicle } from '../shared/profiles'
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

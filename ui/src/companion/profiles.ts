import { call } from './bridge'

export interface VehicleIdentity {
  modelId: string
  brandId: string
  brand: string
  model: string
  fingerprint: string | null
}

export interface ProfileAppearance {
  theme: string
  wallpaper: string | null
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

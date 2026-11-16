import { describe, expect, it } from 'vitest'
import { matchesVehicle, profileForVehicle, type TruckProfile, type VehicleIdentity } from '../shared/profiles'

const truck = (overrides: Partial<VehicleIdentity> = {}): VehicleIdentity => ({
  modelId: 'vehicle.scania.s_2016',
  brandId: 'scania',
  brand: 'Scania',
  model: 'S',
  fingerprint: 'a1b2c3d4',
  ...overrides,
})

const profile = (id: string, vehicle: VehicleIdentity | null): TruckProfile => ({
  schemaVersion: 1,
  id,
  name: id,
  vehicle,
  appearance: { theme: 'electric', wallpaper: null, accentColor: '#35D9FF' },
  applications: [],
  shortcuts: [],
  layout: {},
  createdAt: 1,
  updatedAt: 1,
})

describe('truck profile matching', () => {
  it('prefers the unique fingerprint over a shared model identity', () => {
    const assigned = profile('scania-one', truck({ fingerprint: 'deadbeef' }))
    expect(matchesVehicle(assigned, truck())).toBe(false)
  })

  it('never falls back to model and brand when a fingerprint is unavailable', () => {
    const noFingerprint = profile('scania-one', truck({ fingerprint: null }))
    expect(matchesVehicle(noFingerprint, truck({ fingerprint: null }))).toBe(false)
    expect(matchesVehicle(noFingerprint, truck())).toBe(false)
    expect(matchesVehicle(profile('scania-two', truck()), truck({ fingerprint: null }))).toBe(false)
    expect(matchesVehicle(noFingerprint, truck({ fingerprint: null, modelId: 'vehicle.scania.r_2016' }))).toBe(false)
  })

  it('returns a profile only when exactly one custom profile matches', () => {
    const first = profile('scania-one', truck())
    const second = profile('scania-two', truck())
    expect(profileForVehicle([profile('default', null), first], truck())).toEqual(first)
    expect(profileForVehicle([first, second], truck())).toBeNull()
    expect(profileForVehicle([profile('default', null)], truck())).toBeNull()
  })
})

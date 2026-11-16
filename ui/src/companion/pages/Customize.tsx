import { useEffect, useState } from 'react'
import { BUILT_IN_WALLPAPERS, customWallpaper, type Wallpaper } from '../../cabin/wallpapers'
import type { IconSet, IconStyle } from '../../shared/customize'
import { RELEASED_APP_IDS, type AppId } from '../../cabin/state/apps'
import { isProfileShortcut, type ProfileShortcut } from '../../shared/profiles'
import { type AppIconRole, appIcon } from '../../shared/icons'
import {
  type Added,
  addIconSet,
  addWallpapers,
  customFile,
  FILES_BASE,
  onAdding,
  removeIconSet,
  removeWallpaper,
} from '../customize'
import { Button, Checking, Group, Note, Panel, Row, Tick } from '../room/parts'
import { list } from '../onboarding/words'
import { useWords } from '../room/room'
import { GLOW, useScreenAt } from '../room/screen'
import type { Settings } from '../useSettings'
import type { PageProps } from './page'
import { matchesVehicle, profilesAssign, profilesCreate, profilesDelete, profilesList, profilesUpdate, vehicleIdentity, type TruckProfile } from '../profiles'
import type { CompanionWords } from './words'

const STYLES: IconStyle[] = ['auto', 'light', 'dark']
const PROFILE_APP_NAMES: Record<AppId, string> = {
  maps: 'Maps', music: 'Music', spotify: 'Spotify', youtube: 'YouTube',
  youtubeMusic: 'YouTube Music', player: 'Player', safari: 'Browser',
  phone: 'Phone', messages: 'Messages', calendar: 'Calendar', weather: 'Weather', settings: 'Settings', podcasts: 'Podcasts',
}

/** What's being added: wallpapers (pictures or a folder of them), or an icon set (a folder or a .zip). */
type Adding = 'wallpapers' | 'wallpaperFolder' | 'folder' | 'zip'

/** The apps an icon set has icons for, in the order Home shows them, by their files' names. */
const ICON_FILES: [AppIconRole, string][] = [
  ['maps', 'maps'],
  ['music', 'music'],
  ['spotify', 'spotify'],
  ['podcasts', 'podcasts'],
  ['messages', 'messages'],
  ['phone', 'phone'],
  ['calendar', 'calendar'],
  ['settings', 'settings'],
  ['weather', 'weather'],
  ['youtube', 'youtube'],
  ['youtubeMusic', 'youtube-music'],
  ['player', 'player'],
  ['safari', 'safari'],
]

/**
 * Customize: the player's own wallpapers and app icons. Wallpapers in a grid (WestPlay's, then theirs, and
 * one to add more), app icons as sets (WestPlay's own, then theirs, each showing its icons, and two ways to
 * add one). Choosing one shows it on the room's screen as on the truck's: the companion tells its screen
 * (Companion.tsx), the app tells the truck's (`look` settings). On the room's screen, Home.
 */
export function Customize({ cw, settings, custom, refreshCustom, status }: PageProps) {
  const w = cw.customize
  const words = useWords()
  // What the last add did, shown under the section it added to.
  const [report, setReport] = useState<{ section: 'wallpapers' | 'icons'; added: Added } | null>(null)
  // What's being added: its picker open, then (`adding`) its files being copied and checked, a spinner on it.
  const [working, setWorking] = useState<Adding | null>(null)
  const [adding, setAdding] = useState(false)
  useEffect(() => onAdding(() => setAdding(true)), [])
  useScreenAt('home', GLOW.home, null)
  const look = settings.settings?.look
  const choose = (change: Partial<Settings['look']>) => {
    const current = settings.settings
    if (current) void settings.update({ ...current, look: { ...current.look, ...change } })
  }

  const add = async (what: Adding, adding: () => Promise<Added | null>) => {
    if (working) return
    setWorking(what)
    setAdding(false)
    try {
      const added = await adding()
      if (added) {
        setReport({ section: what === 'wallpapers' || what === 'wallpaperFolder' ? 'wallpapers' : 'icons', added })
        refreshCustom()
      }
    } catch (error) {
      console.error('Adding failed', error)
    } finally {
      setWorking(null)
      setAdding(false)
    }
  }
  const spinning = (what: Adding) => working === what && adding
  const remove = async (removing: Promise<void>) => {
    setReport(null)
    await removing.catch((error: unknown) => console.error('Removing failed', error))
    refreshCustom()
  }

  // The look the icons show in: the room's screen is dark, so Auto shows them dark here.
  const shown = look?.iconStyle === 'light' ? 'light' : 'dark'
  const wallpapers = [...BUILT_IN_WALLPAPERS, ...(custom?.wallpapers ?? []).map((x) => customWallpaper(x, FILES_BASE))]
  const chosenWallpaper = look?.wallpaper ?? wallpapers[0]?.id
  const names = list(
    words,
    ICON_FILES.map(([, file]) => file),
  )

  return (
    <Panel place="page" title={w.title} sub={w.sub}>
      <TruckProfiles status={status} wallpapers={wallpapers} iconSets={(custom?.iconSets ?? []).map((set) => set.name)} />
      <Group title={w.wallpapers} place={4}>
        <div className="cz-wallpapers">
          {wallpapers.map((wallpaper) => (
            <WallpaperTile
              key={wallpaper.id}
              wallpaper={wallpaper}
              chosen={wallpaper.id === chosenWallpaper}
              pair={Boolean(
                wallpaper.variants.dark &&
                wallpaper.variants.light &&
                wallpaper.variants.dark !== wallpaper.variants.light,
              )}
              cw={cw}
              choose={() => choose({ wallpaper: wallpaper.id })}
              remove={wallpaper.id.startsWith('custom:') ? () => void remove(removeWallpaper(wallpaper.id)) : undefined}
            />
          ))}
          <button
            type="button"
            className="cz-add"
            disabled={working !== null}
            aria-busy={spinning('wallpapers')}
            onClick={() => void add('wallpapers', () => addWallpapers(false, w.pickWallpapers, w.images))}
          >
            {spinning('wallpapers') ? <span className="ob-spinner ob-row-spinner" /> : <span aria-hidden>+</span>}
            {w.add}
          </button>
        </div>
        <Row
          title={w.addFolder}
          link
          accessory={spinning('wallpaperFolder') ? <Checking /> : undefined}
          onClick={() => void add('wallpaperFolder', () => addWallpapers(true, w.pickWallpaperFolder, w.images))}
        />
      </Group>
      {report?.section === 'wallpapers' && <AddReport report={report.added} cw={cw} />}
      <p className="cz-note ob-in">{w.wallpapersNote}</p>
      <Group title={w.icons} place={5}>
        <IconSetRow
          name={w.westplay}
          icons={null}
          chosen={!look?.iconSet}
          shown={shown}
          cw={cw}
          choose={() => choose({ iconSet: null })}
        />
        {(custom?.iconSets ?? []).map((set) => (
          <IconSetRow
            key={set.name}
            name={set.name}
            icons={set}
            chosen={look?.iconSet === set.name}
            shown={shown}
            cw={cw}
            choose={() => choose({ iconSet: set.name })}
            remove={() => void remove(removeIconSet(set.name))}
          />
        ))}
        <Row
          title={w.addFolder}
          link
          accessory={spinning('folder') ? <Checking /> : undefined}
          onClick={() => void add('folder', () => addIconSet(false, w.pickFolder, w.zips))}
        />
        <Row
          title={w.addZip}
          link
          accessory={spinning('zip') ? <Checking /> : undefined}
          onClick={() => void add('zip', () => addIconSet(true, w.pickZip, w.zips))}
        />
      </Group>
      {report?.section === 'icons' && <AddReport report={report.added} cw={cw} />}
      <div className="cz-style ob-in" role="radiogroup" aria-label={w.style.title}>
        <span>{w.style.title}</span>
        <span className="cz-segments">
          {STYLES.map((style) => (
            <button
              key={style}
              type="button"
              role="radio"
              aria-checked={(look?.iconStyle ?? 'auto') === style}
              onClick={() => choose({ iconStyle: style })}
            >
              {w.style[style]}
            </button>
          ))}
        </span>
      </div>
      <p className="cz-note ob-in">
        {w.iconsNote.replace('{names}', names)} {w.looksNote}
      </p>
    </Panel>
  )
}


/** Local per-truck profiles. A profile is only marked as matching; changing it never happens silently. */
function TruckProfiles({ status, wallpapers, iconSets }: {
  status: PageProps['status']
  wallpapers: Wallpaper[]
  iconSets: string[]
}) {
  const words = useWords()
  const spanish = words.locale.toLowerCase().startsWith('es')
  const [profiles, setProfiles] = useState<TruckProfile[]>([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [configuring, setConfiguring] = useState<string | null>(null)
  const [appearanceDraft, setAppearanceDraft] = useState<TruckProfile['appearance'] | null>(null)
  const [appsDraft, setAppsDraft] = useState<AppId[]>([])
  const [columnsDraft, setColumnsDraft] = useState<number | null>(null)
  const [shortcutsDraft, setShortcutsDraft] = useState<ProfileShortcut[]>([])
  const [shortcutName, setShortcutName] = useState('')
  const [shortcutUrl, setShortcutUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const truck = status?.game === 'ets2' && status.gameConnected && status.truck?.identityConfident
    ? status.truck
    : null

  const labels = spanish ? {
    title: 'Camiones y perfiles',
    sub: 'Guarda una configuración independiente para cada camión.',
    name: 'Nombre del perfil',
    create: 'Crear perfil para el camión actual',
    current: 'Camión detectado',
    waiting: 'Conectá ETS2 y entrá en un camión compatible para asignar un perfil.',
    assigned: 'Asignado a',
    matches: 'Coincide con el camión actual',
    assign: 'Asignar al camión actual',
    unassigned: 'Sin camión asignado',
    default: 'Perfil predeterminado',
    remove: 'Eliminar',
    empty: 'Todavía no hay perfiles personalizados.',
    failed: 'No se pudieron cargar los perfiles.',
    created: 'Perfil creado y guardado.',
    assignedOk: 'Perfil asignado al camión.',
    deleted: 'Perfil eliminado.',
    edit: 'Editar',
    save: 'Guardar',
    cancel: 'Cancelar',
    confirm: '¿Eliminar este perfil? Esta acción no se puede deshacer.',
    configure: 'Personalizar',
    appearance: 'Apariencia',
    wallpaper: 'Fondo de pantalla',
    iconSet: 'Conjunto de iconos',
    iconStyle: 'Estilo de iconos',
    inheritWallpaper: 'Usar fondo general',
    defaultIcons: 'Iconos predeterminados',
    savedAppearance: 'Configuración del camión guardada.',
    applications: 'Aplicaciones del camión', layout: 'Columnas de inicio', automatic: 'Automático',
    shortcuts: 'Accesos directos web', shortcutName: 'Nombre', shortcutUrl: 'Dirección HTTP(S)', addShortcut: 'Agregar acceso',
    moveUp: 'Subir', moveDown: 'Bajar',
  } : {
    title: 'Trucks and profiles',
    sub: 'Save an independent configuration for each truck.',
    name: 'Profile name',
    create: 'Create a profile for the current truck',
    current: 'Detected truck',
    waiting: 'Connect ETS2 and enter a supported truck to assign a profile.',
    assigned: 'Assigned to',
    matches: 'Matches the current truck',
    assign: 'Assign to current truck',
    unassigned: 'No truck assigned',
    default: 'Default profile',
    remove: 'Delete',
    empty: 'No custom profiles yet.',
    failed: 'Could not load profiles.',
    created: 'Profile created and saved.',
    assignedOk: 'Profile assigned to truck.',
    deleted: 'Profile deleted.',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Delete this profile? This cannot be undone.',
    configure: 'Customize',
    appearance: 'Appearance',
    wallpaper: 'Wallpaper',
    iconSet: 'Icon set',
    iconStyle: 'Icon style',
    inheritWallpaper: 'Use global wallpaper',
    defaultIcons: 'Default icons',
    savedAppearance: 'Truck configuration saved.',
    applications: 'Truck applications', layout: 'Home columns', automatic: 'Automatic',
    shortcuts: 'Web shortcuts', shortcutName: 'Name', shortcutUrl: 'HTTP(S) address', addShortcut: 'Add shortcut',
    moveUp: 'Move up', moveDown: 'Move down',
  }

  const refresh = async () => {
    try {
      setProfiles(await profilesList())
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }
  useEffect(() => { void refresh() }, [])

  const matchesTruck = (profile: TruckProfile) =>
    truck ? matchesVehicle(profile, vehicleIdentity(truck)) : false

  const create = async () => {
    if (!truck || !name.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await profilesCreate(name.trim(), vehicleIdentity(truck))
      setName('')
      await refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const assign = async (id: string) => {
    if (!truck || busy) return
    setBusy(true)
    setError(null)
    try {
      await profilesAssign(id, vehicleIdentity(truck))
      await refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const saveName = async (profile: TruckProfile) => {
    if (!editName.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await profilesUpdate({ ...profile, name: editName.trim() })
      setEditing(null)
      await refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (profile: TruckProfile) => {
    if (busy || !window.confirm(labels.confirm)) return
    setBusy(true)
    setError(null)
    try {
      await profilesDelete(profile.id)
      await refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const saveConfiguration = async (profile: TruckProfile) => {
    if (!appearanceDraft || busy) return
    setBusy(true)
    setError(null)
    try {
      const layout = { ...profile.layout }
      if (columnsDraft === null) delete layout.homeColumns
      else layout.homeColumns = columnsDraft
      await profilesUpdate({ ...profile, appearance: appearanceDraft, applications: appsDraft, shortcuts: shortcutsDraft, layout })
      setConfiguring(null)
      setAppearanceDraft(null)
      await refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }


  return (
    <Group title={labels.title} place={3}>
      <div className="cz-profiles">
        <p className="cz-profiles-sub">{labels.sub}</p>
        {truck ? (
          <div className="cz-truck-current">
            <span>{labels.current}</span>
            <b>{truck.brand} {truck.name}</b>
          </div>
        ) : (
          <p className="cz-profiles-note">{labels.waiting}</p>
        )}
        {truck && (
          <div className="cz-profile-create">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={48}
              placeholder={labels.name}
              aria-label={labels.name}
            />
            <Button small busy={busy} disabled={!name.trim()} onClick={() => void create()}>{labels.create}</Button>
          </div>
        )}
        {profiles.length === 0 && !error && <p className="cz-profiles-note">{labels.empty}</p>}
        {profiles.map((profile) => {
          const matches = matchesTruck(profile)
          const vehicle = profile.vehicle
          return (
            <div className="cz-profile-card" key={profile.id}>
              <div className="cz-profile-info">
                {editing === profile.id ? (
                  <input
                    className="cz-profile-rename"
                    value={editName}
                    maxLength={48}
                    onChange={(event) => setEditName(event.target.value)}
                    aria-label={labels.name}
                  />
                ) : <b>{profile.name}</b>}
                <span>{profile.id === 'default' ? labels.default : vehicle ? `${labels.assigned}: ${vehicle.brand} ${vehicle.model}` : labels.unassigned}</span>
                {matches && <i>{labels.matches}</i>}
              </div>
              <div className="cz-profile-actions">
                {editing === profile.id ? (
                  <>
                    <Button small busy={busy} disabled={!editName.trim()} onClick={() => void saveName(profile)}>{labels.save}</Button>
                    <button type="button" className="cz-profile-delete" disabled={busy} onClick={() => setEditing(null)}>{labels.cancel}</button>
                  </>
                ) : (
                  <>
                    {truck && !matches && profile.id !== 'default' && (
                      <Button small busy={busy} onClick={() => void assign(profile.id)}>{labels.assign}</Button>
                    )}
                    {profile.id !== 'default' && (
                      <button type="button" className="cz-profile-delete" disabled={busy} onClick={() => { setEditing(profile.id); setEditName(profile.name) }}>{labels.edit}</button>
                    )}
                    {profile.id !== 'default' && (
                      <button type="button" className="cz-profile-delete" disabled={busy} onClick={() => {
                        setConfiguring(configuring === profile.id ? null : profile.id)
                        setAppearanceDraft({ ...profile.appearance })
                        setAppsDraft(profile.applications.length ? profile.applications.filter((app): app is AppId => RELEASED_APP_IDS.includes(app as AppId)) : [...RELEASED_APP_IDS])
                        setColumnsDraft(typeof profile.layout.homeColumns === 'number' ? profile.layout.homeColumns : null)
                        setShortcutsDraft(profile.shortcuts.filter(isProfileShortcut))
                        setShortcutName('')
                        setShortcutUrl('')
                      }}>{labels.configure}</button>
                    )}
                    {profile.id !== 'default' && (
                      <button type="button" className="cz-profile-delete" disabled={busy} onClick={() => void remove(profile)}>{labels.remove}</button>
                    )}
                  </>
                )}
              </div>
              {configuring === profile.id && appearanceDraft && profile.id !== 'default' && (
                <div className="cz-profile-config">
                  <label>{labels.appearance}
                    <select value={appearanceDraft.mode ?? 'auto'} onChange={(event) => setAppearanceDraft({ ...appearanceDraft, mode: event.target.value as 'auto' | 'dark' | 'light' })}>
                      <option value="auto">Auto</option><option value="dark">Oscuro / Dark</option><option value="light">Claro / Light</option>
                    </select>
                  </label>
                  <label>{labels.wallpaper}
                    <select value={appearanceDraft.wallpaper ?? ''} onChange={(event) => setAppearanceDraft({ ...appearanceDraft, wallpaper: event.target.value || null })}>
                      <option value="">{labels.inheritWallpaper}</option>
                      {wallpapers.map((wallpaper) => <option key={wallpaper.id} value={wallpaper.id}>{wallpaper.name}</option>)}
                    </select>
                  </label>
                  <label>{labels.iconSet}
                    <select value={appearanceDraft.iconSet ?? ''} onChange={(event) => setAppearanceDraft({ ...appearanceDraft, iconSet: event.target.value || null })}>
                      <option value="">{labels.defaultIcons}</option>
                      {iconSets.map((set) => <option key={set} value={set}>{set}</option>)}
                    </select>
                  </label>
                  <label>{labels.iconStyle}
                    <select value={appearanceDraft.iconStyle ?? 'auto'} onChange={(event) => setAppearanceDraft({ ...appearanceDraft, iconStyle: event.target.value as 'auto' | 'dark' | 'light' })}>
                      <option value="auto">Auto</option><option value="dark">Oscuro / Dark</option><option value="light">Claro / Light</option>
                    </select>
                  </label>
                  <label>{labels.layout}
                    <select value={columnsDraft === null ? 'auto' : String(columnsDraft)} onChange={(event) => setColumnsDraft(event.target.value === 'auto' ? null : Number(event.target.value))}>
                      <option value="auto">{labels.automatic}</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option>
                    </select>
                  </label>
                  <div className="cz-profile-apps">
                    <b>{labels.applications}</b>
                    {appsDraft.map((app, index) => (
                      <div className="cz-profile-app-row" key={app}>
                        <span>{PROFILE_APP_NAMES[app]}</span>
                        <button type="button" disabled={busy || index === 0} aria-label={labels.moveUp} onClick={() => setAppsDraft((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next })}>↑</button>
                        <button type="button" disabled={busy || index === appsDraft.length - 1} aria-label={labels.moveDown} onClick={() => setAppsDraft((current) => { const next = [...current]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next })}>↓</button>
                        <button type="button" disabled={busy || appsDraft.length <= 1} aria-label={PROFILE_APP_NAMES[app]} onClick={() => setAppsDraft((current) => current.filter((item) => item !== app))}>×</button>
                      </div>
                    ))}
                    <div className="cz-profile-app-add">
                      <select value="" onChange={(event) => { const app = event.target.value as AppId; if (app && !appsDraft.includes(app)) setAppsDraft((current) => [...current, app]) }}>
                        <option value="">+ {labels.applications}</option>
                        {RELEASED_APP_IDS.filter((app) => !appsDraft.includes(app)).map((app) => <option key={app} value={app}>{PROFILE_APP_NAMES[app]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="cz-profile-shortcuts">
                    <b>{labels.shortcuts}</b>
                    {shortcutsDraft.map((shortcut) => (
                      <div className="cz-profile-shortcut-row" key={shortcut.id}>
                        <span>{shortcut.name}</span>
                        <button type="button" disabled={busy} onClick={() => setShortcutsDraft((current) => current.filter((item) => item.id !== shortcut.id))}>×</button>
                      </div>
                    ))}
                    <input value={shortcutName} maxLength={40} placeholder={labels.shortcutName} onChange={(event) => setShortcutName(event.target.value)} />
                    <input value={shortcutUrl} maxLength={2048} placeholder="https://example.com" onChange={(event) => setShortcutUrl(event.target.value)} />
                    <Button small disabled={!shortcutName.trim() || !/^https?:\/\/[^\s/?#@]+(?:[/?#][^\s]*)?$/i.test(shortcutUrl) || shortcutsDraft.length >= 20} onClick={() => {
                      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().replaceAll('-', '') : 'shortcut-' + Date.now()
                      setShortcutsDraft((current) => [...current, { id, name: shortcutName.trim(), url: shortcutUrl.trim() }])
                      setShortcutName('')
                      setShortcutUrl('')
                    }}>{labels.addShortcut}</Button>
                  </div>
                  <div className="cz-profile-config-actions">
                    <Button small busy={busy} onClick={() => void saveConfiguration(profile)}>{labels.save}</Button>
                    <button type="button" className="cz-profile-delete" disabled={busy} onClick={() => { setConfiguring(null); setAppearanceDraft(null); setAppsDraft([]); setShortcutsDraft([]) }}>{labels.cancel}</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {error && <p className="cz-profiles-error">{error || labels.failed}</p>}
      </div>
    </Group>
  )
}

function WallpaperTile({
  wallpaper,
  chosen,
  pair,
  cw,
  choose,
  remove,
}: {
  wallpaper: Wallpaper
  chosen: boolean
  pair: boolean
  cw: CompanionWords
  choose(): void
  remove?: () => void
}) {
  const src = wallpaper.variants.dark ?? wallpaper.variants.light
  return (
    <div className="cz-wallpaper" data-chosen={chosen || undefined}>
      <button type="button" className="cz-wallpaper-choose" aria-pressed={chosen} onClick={choose}>
        <img src={src} alt="" loading="lazy" />
        <span className="cz-wallpaper-name">{wallpaper.name}</span>
        {pair && <span className="cz-wallpaper-pair">{cw.customize.pair}</span>}
      </button>
      {remove && (
        <button
          type="button"
          className="cz-remove"
          aria-label={`${cw.customize.remove} ${wallpaper.name}`}
          onClick={remove}
        >
          <RemoveGlyph />
        </button>
      )}
    </div>
  )
}

/** An icon set: its name, how many apps it has icons for, its icons in the look shown (WestPlay's where it
 * has none), and a tick when it's the one shown. */
function IconSetRow({
  name,
  icons,
  chosen,
  shown,
  cw,
  choose,
  remove,
}: {
  name: string
  /** `null`: WestPlay's own. */
  icons: IconSet | null
  chosen: boolean
  shown: 'light' | 'dark'
  cw: CompanionWords
  choose(): void
  remove?: () => void
}) {
  const own = icons ? Object.keys(icons.icons).length : ICON_FILES.length
  return (
    <div className="ob-row cz-set" data-chosen={chosen || undefined}>
      <button type="button" className="cz-set-choose" aria-pressed={chosen} onClick={choose}>
        <span className="cz-set-text">
          <span className="cz-set-head">
            <b title={name}>{name}</b>
            {icons && <span>{cw.customize.iconCount.replace('{n}', String(own))}</span>}
          </span>
          <span className="cz-strip" aria-hidden>
            {ICON_FILES.map(([role]) => {
              const path = icons?.icons[role]?.[shown]
              return (
                <img
                  key={role}
                  src={path ? customFile(path) : appIcon(role, shown)}
                  alt=""
                  data-own={!path || undefined}
                />
              )
            })}
          </span>
        </span>
        <span className="cz-set-tick">{chosen && <Tick done />}</span>
      </button>
      {remove && (
        <button type="button" className="cz-remove" aria-label={`${cw.customize.remove} ${name}`} onClick={remove}>
          <RemoveGlyph />
        </button>
      )}
    </div>
  )
}

/** What adding did: what was added, and each file left out, with why. */
function AddReport({ report, cw }: { report: Added; cw: CompanionWords }) {
  const w = cw.customize
  const words = useWords()
  return (
    <Note tone={report.added.length ? 'calm' : 'bad'}>
      <b>{report.added.length ? w.added.replace('{names}', list(words, report.added)) : w.nothingAdded}</b>
      {report.problems.map((problem) => (
        <span key={problem.file} className="cz-problem">
          {problem.file}: {w.problems[problem.reason]}
        </span>
      ))}
    </Note>
  )
}

function RemoveGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M8 8l8 8M16 8l-8 8" />
    </svg>
  )
}

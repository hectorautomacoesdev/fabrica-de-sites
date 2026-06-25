import 'leaflet/dist/leaflet.css'
import { useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import type { BusinessRead } from '../api/client'
import { useBusinesses } from '../hooks/useScout'
import LeadDrawer from './LeadDrawer'

// Cores por nível de score — alinhadas com os badges da tabela
const SCORE_COLORS: Record<string, string> = {
  ALTÍSSIMA: '#dc2626',
  ALTA:      '#d97706',
  MÉDIA:     '#4f46e5',
  BAIXA:     '#6b7280',
}

// Pré-cria um ícone por score_label para não recriar em cada render
const ICONS: Record<string, L.DivIcon> = Object.fromEntries(
  Object.entries(SCORE_COLORS).map(([label, color]) => [
    label,
    L.divIcon({
      className: '',
      html: `<div style="width:13px;height:13px;border-radius:50%;background:${color};border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
      iconSize: [13, 13],
      iconAnchor: [6, 6],
    }),
  ])
)
const ICON_DEFAULT = ICONS.BAIXA

interface Props {
  runId: number
  cidade?: string
}

export default function MapView({ runId, cidade }: Props) {
  const { data: businesses = [], isLoading } = useBusinesses(runId, { limit: 5000 })
  const [selected, setSelected] = useState<BusinessRead | null>(null)

  const withCoords = useMemo(
    () => businesses.filter(b => b.lat != null && b.lon != null),
    [businesses],
  )

  const center = useMemo((): [number, number] => {
    if (withCoords.length === 0) return [-23.9942, -46.2566]
    const avg = (ns: number[]) => ns.reduce((a, b) => a + b, 0) / ns.length
    return [avg(withCoords.map(b => b.lat!)), avg(withCoords.map(b => b.lon!))]
  }, [withCoords])

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-border bg-card text-[0.85rem] text-text-muted">
        Carregando mapa…
      </div>
    )
  }

  if (withCoords.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-border bg-card text-[0.85rem] text-text-muted">
        Nenhum negócio com coordenadas nesta execução.
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: 420 }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a>'
          />
          {withCoords.map(b => (
            <Marker
              key={b.id}
              position={[b.lat!, b.lon!]}
              icon={ICONS[b.score_label] ?? ICON_DEFAULT}
              eventHandlers={{ click: () => setSelected(b) }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Legenda */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.78rem] text-text-muted">
        {Object.entries(SCORE_COLORS).map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ background: color }}
            />
            {label.charAt(0) + label.slice(1).toLowerCase()}
          </span>
        ))}
        <span className="ml-auto">
          {withCoords.length}/{businesses.length} com coordenadas
        </span>
      </div>

      <LeadDrawer business={selected} cidade={cidade} onClose={() => setSelected(null)} />
    </>
  )
}

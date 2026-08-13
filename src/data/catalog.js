import returnTrip from './trips/castro-madrid-2026.json' with { type: 'json' }
import outboundTrip from './trips/madrid-castro-2026.json' with { type: 'json' }

const roadbookCatalog = [
  {
    id: 'castro-urdiales-2026-08',
    title: 'Castro Urdiales',
    subtitle: 'Agosto 2026',
    trips: [
      { role: 'outbound', label: 'Ida', trip: outboundTrip },
      { role: 'return', label: 'Vuelta', trip: returnTrip }
    ]
  }
]

export default roadbookCatalog

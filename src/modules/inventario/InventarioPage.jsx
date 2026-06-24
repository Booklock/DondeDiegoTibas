import { PageHeader } from '../../components/ui/PageHeader'
import { Package } from 'lucide-react'

export default function InventarioPage() {
  return (
    <div className="p-6">
      <PageHeader title="Inventario" subtitle="Módulo en desarrollo" />
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Package size={48} className="mb-3 text-gray-300" />
        <p className="text-lg font-medium">Próximamente</p>
        <p className="text-sm">Este módulo estará disponible en la siguiente versión.</p>
      </div>
    </div>
  )
}

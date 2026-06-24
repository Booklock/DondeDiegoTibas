import { PageHeader } from '../../components/ui/PageHeader'
import { Truck } from 'lucide-react'

export default function ProveedoresPage() {
  return (
    <div className="p-6">
      <PageHeader title="Proveedores" subtitle="Módulo en desarrollo" />
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Truck size={48} className="mb-3 text-gray-300" />
        <p className="text-lg font-medium">Próximamente</p>
        <p className="text-sm">Este módulo estará disponible en la siguiente versión.</p>
      </div>
    </div>
  )
}

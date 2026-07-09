import { Component } from 'react'

function isChunkLoadError(error) {
  const msg = error?.message ?? ''
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    (error?.name === 'TypeError' && msg.includes('import'))
  )
}

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, reloading: false }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error)) {
      this.setState({ reloading: true })
      window.location.reload()
    }
  }

  render() {
    if (this.state.reloading) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Actualizando la aplicación…</p>
          </div>
        </div>
      )
    }

    if (this.state.error) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-lg w-full">
            <p className="text-4xl mb-4">⚠️</p>
            <h1 className="text-xl font-bold text-red-700 mb-2">Error de aplicación</h1>
            <p className="text-sm text-gray-600 mb-4">
              La aplicación encontró un error al cargar. Intentá recargar la página.
            </p>
            <pre className="bg-red-50 rounded-lg p-3 text-xs text-red-800 overflow-auto mb-4">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

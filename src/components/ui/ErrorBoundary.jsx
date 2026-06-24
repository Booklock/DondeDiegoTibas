import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-lg w-full">
            <p className="text-4xl mb-4">⚠️</p>
            <h1 className="text-xl font-bold text-red-700 mb-2">Error de aplicación</h1>
            <p className="text-sm text-gray-600 mb-4">
              La aplicación encontró un error al cargar. Revisá la configuración.
            </p>
            <pre className="bg-red-50 rounded-lg p-3 text-xs text-red-800 overflow-auto">
              {this.state.error.message}
            </pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

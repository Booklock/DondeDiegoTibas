import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { AlertCircle, CheckCircle, ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError('No se pudo enviar el correo. Verificá la dirección.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="Donde Diego Chicharronera" className="h-32 w-auto mx-auto rounded-2xl mb-4 shadow-md" />
          <p className="text-gray-500 mt-1">Sistema de gestión interna</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={28} className="text-green-600" />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Revisá tu correo</h2>
              <p className="text-sm text-gray-500">
                Si <strong>{email}</strong> está registrado, vas a recibir un enlace para restablecer tu contraseña.
              </p>
              <p className="text-xs text-gray-400">El enlace expira en 1 hora.</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Olvidaste tu contraseña</h2>
              <p className="text-sm text-gray-500 mb-6">
                Ingresá tu correo y te enviamos un enlace para crear una nueva contraseña.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                    placeholder="nombre@ejemplo.com"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-700">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition"
                >
                  <Mail size={16} />
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link to="/login" className="inline-flex items-center gap-1 text-brand-600 hover:underline font-medium">
            <ArrowLeft size={13} /> Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

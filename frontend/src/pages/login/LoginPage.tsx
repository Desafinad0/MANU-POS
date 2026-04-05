import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'password' | 'pin'>('password');
  const [loading, setLoading] = useState(false);
  const { login, loginWithPin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'password') {
        await login(username, password);
      } else {
        await loginWithPin(pin);
      }
      toast.success('Bienvenido a Manu POS');
      navigate('/pos');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al iniciar sesión';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const pinDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-600 to-cyan-700 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-1">Manu</h1>
          <p className="text-teal-200 text-lg">Aguachiles</p>
        </div>

        <div className="card p-6">
          {/* Mode tabs */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('password')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'password' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
              }`}
            >
              Usuario y Contraseña
            </button>
            <button
              onClick={() => setMode('pin')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'pin' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
              }`}
            >
              PIN Rápido
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'password' ? (
              <div className="space-y-4">
                <div>
                  <label className="label">Usuario</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input"
                    placeholder="admin"
                    autoComplete="username"
                    required
                  />
                </div>
                <div>
                  <label className="label">Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* PIN display */}
                <div className="flex justify-center gap-3 mb-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold ${
                        pin[i]
                          ? 'border-manu-teal bg-teal-50 text-manu-teal'
                          : 'border-gray-300'
                      }`}
                    >
                      {pin[i] ? '•' : ''}
                    </div>
                  ))}
                </div>

                {/* Numeric keypad */}
                <div className="grid grid-cols-3 gap-2">
                  {pinDigits.map((digit, i) => (
                    <button
                      key={i}
                      type={digit === '' ? 'button' : digit === 'del' ? 'button' : pin.length >= 4 ? 'submit' : 'button'}
                      disabled={digit === ''}
                      onClick={() => {
                        if (digit === 'del') {
                          setPin((p) => p.slice(0, -1));
                        } else if (digit !== '' && pin.length < 4) {
                          const newPin = pin + digit;
                          setPin(newPin);
                          if (newPin.length === 4) {
                            // Auto-submit
                            setTimeout(() => {
                              const form = document.querySelector('form');
                              form?.requestSubmit();
                            }, 200);
                          }
                        }
                      }}
                      className={`py-4 rounded-xl text-xl font-semibold transition-colors ${
                        digit === ''
                          ? 'invisible'
                          : digit === 'del'
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                          : 'bg-gray-50 text-gray-800 hover:bg-gray-100 active:bg-teal-100'
                      }`}
                    >
                      {digit === 'del' ? '⌫' : digit}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

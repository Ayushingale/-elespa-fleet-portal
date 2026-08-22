import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

export default function Login() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(form);
      navigate('/');
    } catch (err) {
      if (err.response) {
        setError(`Server said (${err.response.status}): ${err.response.data?.error || 'unknown error'}`);
      } else if (err.request) {
        setError('No response from backend — is it running on http://localhost:4000?');
      } else {
        setError(`Error: ${err.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#151821]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[#1E2333] rounded-xl p-8 space-y-4"
      >
        <h1 className="text-xl font-bold text-white">Fleet Portal Login</h1>
        <input
          className="w-full rounded-md bg-[#151821] border border-white/10 px-3 py-2 text-white"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          type="password"
          className="w-full rounded-md bg-[#151821] border border-white/10 px-3 py-2 text-white"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full rounded-md bg-indigo-600 hover:bg-indigo-500 text-white py-2 font-semibold"
        >
          {status === 'loading' ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
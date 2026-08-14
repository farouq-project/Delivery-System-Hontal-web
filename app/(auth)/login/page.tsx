'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { PLATFORM } from '@/lib/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const res = await authApi.login(data.email, data.password);
      const { user, token } = res.data.data;
      setAuth(user, token);
      if (user.role === 'driver') {
        router.push('/driver');
      } else if (user.role === 'hontal_dispatcher') {
        router.push('/kirim/dispatch');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Login failed. Check your credentials.');
    }
  };

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left panel — visible on lg+ */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gray-900 p-12 text-white">
        <div>
          <p className="text-xl font-bold tracking-tight">{PLATFORM.name}</p>
          <p className="text-sm text-gray-400 mt-1">{PLATFORM.tagline}</p>
        </div>
        <div>
          <p className="text-lg font-medium text-gray-200 leading-relaxed">
            "Smarter routing, deeper insights, happier customers."
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Delivery operations platform built for modern distributors.
          </p>
        </div>
        <p className="text-xs text-gray-600">© {year} {PLATFORM.name}. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col flex-1 min-h-screen">
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="lg:hidden mb-8 text-center">
              <p className="text-xl font-bold text-gray-900">{PLATFORM.name}</p>
              <p className="text-sm text-gray-500 mt-1">{PLATFORM.tagline}</p>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Sign in to your workspace</h1>
              <p className="text-sm text-gray-500 mt-1">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-xs text-blue-600 hover:text-blue-700">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-500">
                Belum punya akun?{' '}
                <a href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                  Daftar sebagai merchant
                </a>
              </p>
              <p className="text-sm text-gray-500">
                Need help?{' '}
                <a href={`mailto:${PLATFORM.supportEmail}`} className="text-blue-600 hover:text-blue-700">
                  Contact support
                </a>
              </p>
            </div>
          </div>
        </div>

        <footer className="py-4 px-6 text-center text-xs text-gray-400 space-x-3">
          <a href="#" className="hover:text-gray-600">Privacy Policy</a>
          <span>·</span>
          <a href="#" className="hover:text-gray-600">Terms of Service</a>
          <span>·</span>
          <span>{PLATFORM.name} v{PLATFORM.version} © {year}</span>
        </footer>
      </div>
    </div>
  );
}

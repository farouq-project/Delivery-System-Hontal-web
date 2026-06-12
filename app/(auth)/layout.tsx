import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import { LoadingSpinner } from '@/components/ui/Loading';

export default function LoginLoading() {
  return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" /></div>;
}

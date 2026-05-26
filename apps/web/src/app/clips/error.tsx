'use client';

import { ErrorPage } from '@/components/ui/Loading';

export default function ClipsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPage error={error} reset={reset} />;
}

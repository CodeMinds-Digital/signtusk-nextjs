'use client';

import { MultiSignatureVerification } from '@/components/multi-signature/MultiSignatureVerification';
import { useRouter } from 'next/navigation';
import { use } from 'react';

interface VerifyPageProps {
  params: Promise<{ id: string }>;
}

export default function MultiSignatureVerifyPage({ params }: VerifyPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  
  return (
    <MultiSignatureVerification
      multiSignatureId={resolvedParams.id}
      onClose={() => router.push('/multi-signature')}
    />
  );
}

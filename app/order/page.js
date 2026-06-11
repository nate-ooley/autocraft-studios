import { Suspense } from 'react';
import OrderWizard from './wizard';

export const metadata = {
  title: 'Start Your Order — AutoCraft Studios',
};

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="wizard-wrap">Loading…</div>}>
      <OrderWizard />
    </Suspense>
  );
}

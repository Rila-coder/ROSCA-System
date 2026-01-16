import PaymentsClient from '@/components/payments/PaymentsClient';

export const metadata = {
  title: 'Payment Tracking | ROSCA',
  description: 'Track and manage all payments across your groups',
};

export default function PaymentsPage() {
  return <PaymentsClient />;
}
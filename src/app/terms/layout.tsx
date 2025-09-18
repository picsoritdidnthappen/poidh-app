import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'Terms',
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

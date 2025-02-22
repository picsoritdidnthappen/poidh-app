import FrameLayoutClient from '@/app/(frames)/layout.client';

export const metadata = {
  title: 'POIDH Frame',
  description: 'POIDH Frame Layout',
};

export default function FrameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FrameLayoutClient>{children}</FrameLayoutClient>;
}

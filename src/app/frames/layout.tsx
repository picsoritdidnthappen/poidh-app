// app/frame/layout.tsx
import '@/styles/globals.css';
import '@/styles/colors.css';
import { TRPCProvider } from '@/trpc/client';

export default function FrameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body className='bg-blue-300 text-white'>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}

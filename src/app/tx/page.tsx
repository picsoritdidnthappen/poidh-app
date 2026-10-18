import { Metadata } from 'next';
import TxApproval from './TxApproval';

export const metadata: Metadata = {
  title: 'approve | poidh',
  description: 'Review and approve a poidh transaction prepared by an agent.',
  robots: { index: false, follow: false },
};

/**
 * /tx: approval page for actions prepared by agents (MCP signUrl, WebMCP).
 * The query string names an action in plain parameters; the page rebuilds
 * the transaction itself and the person signs with their own wallet.
 */
export default function TxPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') params.set(key, value);
  }
  return <TxApproval query={params.toString()} />;
}

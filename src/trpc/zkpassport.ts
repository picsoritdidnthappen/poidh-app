import { ZKPassport, type RequestSuccess } from '@zkpassport/sdk';

type ProofResult = RequestSuccess['proofs'][number];
type CommittedCircuit = 'bind' | 'disclose_bytes';

function committedInputsFor(proofs: ProofResult[], circuit: CommittedCircuit) {
  return proofs.flatMap((proof) => {
    const name = proof.name ?? '';

    if (!name.startsWith('outer') && !name.startsWith(circuit)) {
      return [];
    }

    const inputs =
      proof.committedInputs?.[circuit] ??
      proof.committedInputs?.[`${circuit}_evm`];

    return inputs ? [inputs] : [];
  });
}

export async function verifyNationalityProof({
  host,
  address,
  proofs,
  queryResult,
}: {
  host: string;
  address: string;
  proofs: RequestSuccess['proofs'];
  queryResult: RequestSuccess['result'];
}) {
  const zkPassport = new ZKPassport(host);

  const { query: originalQuery } = zkPassport
    .createQuery()
    .disclose('nationality')
    .bind('user_address', address as `0x${string}`)
    .done();

  const { verified, uniqueIdentifier } = await zkPassport
    .verify({
      proofs,
      originalQuery,
      queryResult,
      scope: 'poidh-profile-verification',
      verifierMode: 'api',
    })
    .catch((error) => {
      console.error('zkPassport verification failed', error);
      return { verified: false, uniqueIdentifier: undefined };
    });

  if (!verified || !uniqueIdentifier) {
    return null;
  }

  const country = queryResult.nationality?.disclose?.result;

  if (
    typeof country !== 'string' ||
    !/^[A-Z]{3}$/.test(country) ||
    committedInputsFor(proofs, 'disclose_bytes').length === 0
  ) {
    return null;
  }

  const bindings = committedInputsFor(proofs, 'bind') as {
    data?: { user_address?: string };
  }[];

  const isBoundToAddress =
    bindings.length > 0 &&
    bindings.every(
      ({ data }) => data?.user_address?.toLowerCase() === address.toLowerCase()
    );

  if (!isBoundToAddress) {
    return null;
  }

  return { uniqueIdentifier, country };
}

/**
 * @jest-environment node
 */
import { getProtocolContractLabel } from '../protocolContracts';

jest.mock('@/utils/publicClients', () => ({}));

describe('getProtocolContractLabel', () => {
  // The hand-typed map was missing an "f" in the mainnet core address
  // (bounty #1495, claim 8934), so get_account treated it as a user.
  it('recognizes the mainnet core contract', () => {
    expect(
      getProtocolContractLabel('0xE731dFadBFf20542E10D09D26Fc71445C70d4232')
    ).toBe('poidh v3 core contract');
  });

  it.each([
    ['0x5555fa783936c260f77385b4e153b9725fef1719', 'poidh v3 core contract'],
    ['0x9c5F45D5e1382e4058D334d93C6c01442012a4D9', 'poidh claim NFT contract'],
    ['0x27E117Cc9A8DA363442e7Bd0618939E3EEEACF6A', 'poidh claim NFT contract'],
    [
      '0x18e5585ca7ce31b90bc8bb7aaf84152857ce243f',
      'historical poidh Degen core contract',
    ],
    [
      '0x39f04b7897dcaf9dc454e433f43fb1c3bb528e11',
      'historical poidh Degen claim NFT contract',
    ],
  ])('labels %s as %s', (address, label) => {
    expect(getProtocolContractLabel(address)).toBe(label);
  });

  it('returns null for everyone else, including the old typo', () => {
    expect(
      getProtocolContractLabel('0x1111111111111111111111111111111111111111')
    ).toBeNull();
    expect(
      getProtocolContractLabel('0xe731dfadbf20542e10d09d26fc71445c70d4232')
    ).toBeNull();
  });
});

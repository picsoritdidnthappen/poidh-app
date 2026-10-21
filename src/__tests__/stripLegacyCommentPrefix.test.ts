/**
 * @jest-environment node
 */
import { stripLegacyCommentPrefix } from '@/utils/utils';

const checksummed = '0xAbC0000000000000000000000000000000000001';
const lowercase = checksummed.toLowerCase();

describe('stripLegacyCommentPrefix', () => {
  it('removes the prefix early comments were saved with', () => {
    const body = `${checksummed} wants to create a comment. Comment content: \nnice bounty`;

    expect(stripLegacyCommentPrefix({ body, address: lowercase })).toBe(
      'nice bounty'
    );
  });

  it('leaves normal comments alone', () => {
    expect(
      stripLegacyCommentPrefix({ body: 'nice bounty', address: lowercase })
    ).toBe('nice bounty');
  });

  it("leaves a prefix with someone else's address alone", () => {
    const body = `0x0000000000000000000000000000000000000002 wants to create a comment. Comment content: \nhi`;

    expect(stripLegacyCommentPrefix({ body, address: lowercase })).toBe(body);
  });
});

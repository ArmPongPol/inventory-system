import { containsPattern } from './like-pattern';

describe('containsPattern', () => {
  it('wraps the text in wildcards', () => {
    expect(containsPattern('water')).toBe('%water%');
  });

  it('escapes the LIKE metacharacters in the text', () => {
    expect(containsPattern('50%_off\\')).toBe('%50\\%\\_off\\\\%');
  });
});

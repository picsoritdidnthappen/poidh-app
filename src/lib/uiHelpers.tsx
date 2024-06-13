export const applyBreakAllToLongWords = (
  val = '',
  wordThresholdLength = 40
) => {
  return val.split(/\s/).map((word, i) => {
    if (word.length > wordThresholdLength) {
      return (
        <span className='break-all' key={i}>
          {word}{' '}
        </span>
      );
    } else {
      return word + ' ';
    }
  });
};

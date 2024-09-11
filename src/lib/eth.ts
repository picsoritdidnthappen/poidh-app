export const weiToEth = (wei: string | bigint | number): string => {
  const etherValue = Number(wei) / 1e18;
  return etherValue.toFixed(6);
};

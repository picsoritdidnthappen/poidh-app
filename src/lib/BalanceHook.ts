import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

const { primaryWallet } = useDynamicContext();

const  getBalance = async (primaryWallet: any) => {
  const balance = await primaryWallet.connector.getBalance();
  return balance;
};

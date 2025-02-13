import Web3 from "web3";
import contractABI from "./contractABI.json"; // Ensure this file exists

const contractAddress = "0x2e5B26395C76FaEa7e45C19aE770624B38A81C21"; // Replace with your deployed contract address

// Function to initialize Web3
export async function getWeb3() {
  if (window.ethereum) {
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      return new Web3(window.ethereum);
    } catch (error) {
      console.error("User denied account access or error occurred", error);
      return null;
    }
  } else {
    console.error("No web3 provider found. Please install MetaMask.");
    return null;
  }
}

// Function to get the contract instance
export async function getContract() {
  const web3 = await getWeb3();
  if (!web3) return null; // Exit if web3 is not available

  try {
    const accounts = await web3.eth.getAccounts();
    const account = accounts[0];

    // Fix potential error with ABI import
    const contract = new web3.eth.Contract(contractABI.abi, contractAddress, {
      from: account,
    });

    return { web3, contract, account };
  } catch (error) {
    console.error("Error initializing contract", error);
    return null;
  }
}

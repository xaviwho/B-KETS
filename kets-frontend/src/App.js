import React, { useEffect, useState } from "react";
import { getWeb3, getContract } from "./utils/contract";

function App() {
  const [contract, setContract] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [regulator, setRegulator] = useState("Fetching...");
  const [industryName, setIndustryName] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [industriesList, setIndustriesList] = useState([]);

  // Load contract data when component mounts
  useEffect(() => {
    async function loadContractData() {
      try {
        console.log("🔍 Loading Web3 and Contract...");
        const result = await getContract();

        if (result && result.contract) {
          console.log("✅ Contract Loaded:", result.contract);
          setContract(result.contract);
          setWeb3(result.web3);
          setAccount(result.account);

          // Fetch contract regulator
          try {
            const regAddr = await result.contract.methods.regulator().call();
            console.log("🔹 Regulator Address:", regAddr);

            setRegulator(
              regAddr && regAddr !== "0x0000000000000000000000000000000000000000"
                ? regAddr
                : "Not Set in Smart Contract"
            );
          } catch (regulatorError) {
            console.error("❌ Error fetching regulator:", regulatorError);
            setRegulator("Error fetching regulator");
          }

          // Fetch all industries registered by the account
          fetchIndustries(result.contract, result.account);
        } else {
          console.error("❌ Contract not found or failed to load.");
          setRegulator("Contract not found");
        }
      } catch (error) {
        console.error("❌ Error loading contract:", error);
        setRegulator("Error fetching regulator");
      }
    }
    loadContractData();
  }, []);

  // Fetch all industries for an account
  async function fetchIndustries(contract, account) {
    try {
      console.log("📡 Fetching industries for account:", account);

      // Get industry data
      const { names, isRegistered, isEITE } =
        await contract.methods.getIndustriesByOwner(account).call();

      console.log("📄 Industries Registered:", names);

      // Format data properly
      if (names.length > 0) {
        const industriesFormatted = names.map((name, index) => ({
          name,
          isRegistered: isRegistered[index],
          isEITE: isEITE[index],
        }));
        setIndustriesList(industriesFormatted);
      } else {
        setIndustriesList([]);
      }
    } catch (error) {
      console.error("❌ Error fetching industries:", error);
    }
  }

  // Handler for industry registration
  async function handleRegisterIndustry(e) {
    e.preventDefault();
    if (!contract || !web3) {
      console.error("❌ Contract or Web3 not initialized. Cannot register industry.");
      setRegistrationStatus("Contract/Web3 not initialized.");
      return;
    }

    if (!industryName) {
      console.error("❌ Industry name is empty.");
      setRegistrationStatus("Industry name cannot be empty.");
      return;
    }

    try {
      console.log("📌 Attempting registration for:", industryName);
      console.log("🔹 Account:", account);

      // Get gas price dynamically
      const gasPrice = await web3.eth.getGasPrice();
      console.log("⛽ Gas Price (Legacy):", gasPrice);

      const tx = await contract.methods.registerIndustry(industryName, true).send({
        from: account,
        gas: 300000, // Adjust gas limit based on actual contract execution cost
        gasPrice: gasPrice,
      });

      console.log("✅ Transaction successful:", tx);
      setRegistrationStatus("Industry registered successfully!");

      // Fetch updated industries list
      await fetchIndustries(contract, account);

      // Clear input field
      setIndustryName("");
    } catch (error) {
      console.error("❌ Error registering industry:", error);
      setRegistrationStatus("Registration failed. See console for details.");
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>KETS Blockchain dApp</h1>
      <p><strong>Connected Account:</strong> {account || "Not connected"}</p>
      <p><strong>Contract Regulator:</strong> {regulator}</p>

      <hr />

      <h2>Register as Industry</h2>
      <form onSubmit={handleRegisterIndustry}>
        <label>
          Industry Name:{" "}
          <input
            type="text"
            value={industryName}
            onChange={(e) => setIndustryName(e.target.value)}
            placeholder="Enter industry name"
          />
        </label>
        <button type="submit">Register</button>
      </form>
      {registrationStatus && <p>{registrationStatus}</p>}

      <h2>Registered Industries</h2>
      {industriesList.length > 0 ? (
        <ul>
          {industriesList.map((industry, index) => (
            <li key={index}>
              <strong>{industry.name}</strong> (Registered: {industry.isRegistered ? "✅" : "❌"}, EITE:{" "}
              {industry.isEITE ? "Yes" : "No"})
            </li>
          ))}
        </ul>
      ) : (
        <p>No industries registered yet.</p>
      )}
    </div>
  );
}

export default App;

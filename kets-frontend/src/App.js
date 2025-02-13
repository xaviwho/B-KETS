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

  // Auction states
  const [auctionCredits, setAuctionCredits] = useState("");
  const [minBidPrice, setMinBidPrice] = useState("");
  const [auctionStatus, setAuctionStatus] = useState("");
  const [auctionInfo, setAuctionInfo] = useState({ creditsAvailable: 0, minBidPrice: 0, isActive: false });
  const [bidCredits, setBidCredits] = useState("");
  const [bidStatus, setBidStatus] = useState("");

  // Free Allocation states (for regulator)
  const [allocationIndustry, setAllocationIndustry] = useState("");
  const [allocationIndex, setAllocationIndex] = useState("");
  const [allocationCredits, setAllocationCredits] = useState("");
  const [allocationStatus, setAllocationStatus] = useState("");

  // Load contract and initial data when component mounts
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

          // Fetch regulator from contract
          try {
            const regAddr = await result.contract.methods.regulator().call();
            console.log("🔹 Regulator Address:", regAddr);
            setRegulator(
              regAddr && regAddr !== "0x0000000000000000000000000000000000000000"
                ? regAddr
                : "Not Set"
            );
          } catch (regError) {
            console.error("❌ Error fetching regulator:", regError);
            setRegulator("Error fetching regulator");
          }

          // Fetch industries registered by the account
          fetchIndustries(result.contract, result.account);
          // Fetch auction info
          fetchAuctionInfo(result.contract);
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

  // Function to fetch industries registered by an account
  async function fetchIndustries(contract, account) {
    try {
      console.log("📡 Fetching industries for account:", account);
      const { names, isRegistered, isEITE } = await contract.methods.getIndustriesByOwner(account).call();
      console.log("📄 Industries Registered:", names);
      if (names.length > 0) {
        const formatted = names.map((name, index) => ({
          name,
          isRegistered: isRegistered[index],
          isEITE: isEITE[index],
        }));
        setIndustriesList(formatted);
      } else {
        setIndustriesList([]);
      }
    } catch (error) {
      console.error("❌ Error fetching industries:", error);
    }
  }

  // Function to fetch auction details from the contract
  async function fetchAuctionInfo(contract) {
    try {
      const info = await contract.methods.currentAuction().call();
      // info returns creditsAvailable, minBidPrice, isActive (mapping not returned)
      setAuctionInfo({
        creditsAvailable: info.creditsAvailable,
        minBidPrice: info.minBidPrice,
        isActive: info.isActive,
      });
    } catch (error) {
      console.error("❌ Error fetching auction info:", error);
    }
  }

  // Handler for registering an industry
  async function handleRegisterIndustry(e) {
    e.preventDefault();
    if (!contract || !web3) {
      setRegistrationStatus("Contract/Web3 not initialized.");
      return;
    }
    if (!industryName) {
      setRegistrationStatus("Industry name cannot be empty.");
      return;
    }
    try {
      console.log("📌 Registering industry:", industryName);
      const gasPrice = await web3.eth.getGasPrice();
      const tx = await contract.methods.registerIndustry(industryName, true).send({
        from: account,
        gas: 300000,
        gasPrice: gasPrice,
      });
      console.log("✅ Registration successful:", tx);
      setRegistrationStatus("Industry registered successfully!");
      await fetchIndustries(contract, account);
      setIndustryName("");
    } catch (error) {
      console.error("❌ Registration error:", error);
      setRegistrationStatus("Registration failed. See console.");
    }
  }

  // Handler for free allocation (Regulator Only)
  async function handleFreeAllocation(e) {
    e.preventDefault();
    if (!contract || !web3) {
      setAllocationStatus("Contract/Web3 not initialized.");
      return;
    }
    if (!allocationIndustry || allocationIndex === "" || !allocationCredits) {
      setAllocationStatus("Please fill all fields for free allocation.");
      return;
    }
    try {
      const gasPrice = await web3.eth.getGasPrice();
      const tx = await contract.methods.freeAllocation(allocationIndustry, allocationIndex, allocationCredits).send({
        from: account,
        gas: 300000,
        gasPrice: gasPrice,
      });
      console.log("✅ Free allocation successful:", tx);
      setAllocationStatus("Free allocation successful!");
      // If allocating to the current account, refresh industry list
      if (allocationIndustry.toLowerCase() === account.toLowerCase()) {
        fetchIndustries(contract, account);
      }
      setAllocationIndustry("");
      setAllocationIndex("");
      setAllocationCredits("");
    } catch (error) {
      console.error("❌ Free allocation error:", error);
      setAllocationStatus("Free allocation failed. See console.");
    }
  }

  // Handler for auction creation (Regulator Only)
  async function handleCreateAuction(e) {
    e.preventDefault();
    if (!contract || !web3) {
      setAuctionStatus("Contract/Web3 not initialized.");
      return;
    }
    if (!auctionCredits || !minBidPrice) {
      setAuctionStatus("Please fill auction fields.");
      return;
    }
    try {
      const gasPrice = await web3.eth.getGasPrice();
      const tx = await contract.methods.createAuction(auctionCredits, minBidPrice).send({
        from: account,
        gas: 300000,
        gasPrice: gasPrice,
      });
      console.log("✅ Auction created:", tx);
      setAuctionStatus("Auction created successfully!");
      fetchAuctionInfo(contract);
      setAuctionCredits("");
      setMinBidPrice("");
    } catch (error) {
      console.error("❌ Auction creation error:", error);
      setAuctionStatus("Auction creation failed. See console.");
    }
  }

  // Handler for placing a bid (All Users)
  async function handlePlaceBid(e) {
    e.preventDefault();
    if (!contract || !web3) {
      setBidStatus("Contract/Web3 not initialized.");
      return;
    }
    if (!bidCredits) {
      setBidStatus("Please enter bid credits.");
      return;
    }
    try {
      // Calculate required ETH (bidCredits * current minBidPrice)
      const bidPrice = auctionInfo.minBidPrice;
      const requiredValue = web3.utils.toBN(bidCredits).mul(web3.utils.toBN(bidPrice));
      const gasPrice = await web3.eth.getGasPrice();
      const tx = await contract.methods.placeBid(bidCredits).send({
        from: account,
        gas: 300000,
        gasPrice: gasPrice,
        value: requiredValue,
      });
      console.log("✅ Bid placed:", tx);
      setBidStatus("Bid placed successfully!");
      fetchAuctionInfo(contract);
      setBidCredits("");
    } catch (error) {
      console.error("❌ Bid error:", error);
      setBidStatus("Bid failed. See console.");
    }
  }

  // Handler for finalizing the auction (Regulator Only)
  async function handleFinalizeAuction() {
    if (!contract || !web3) {
      setAuctionStatus("Contract/Web3 not initialized.");
      return;
    }
    try {
      const gasPrice = await web3.eth.getGasPrice();
      const tx = await contract.methods.finalizeAuction().send({
        from: account,
        gas: 500000,
        gasPrice: gasPrice,
      });
      console.log("✅ Auction finalized:", tx);
      setAuctionStatus("Auction finalized successfully!");
      fetchAuctionInfo(contract);
    } catch (error) {
      console.error("❌ Finalize auction error:", error);
      setAuctionStatus("Auction finalization failed. See console.");
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
              <strong>{industry.name}</strong> (Registered: {industry.isRegistered ? "✅" : "❌"}, EITE: {industry.isEITE ? "Yes" : "No"})
            </li>
          ))}
        </ul>
      ) : (
        <p>No industries registered yet.</p>
      )}

      <hr />

      {/* Free Allocation Section (Regulator Only) */}
      {account.toLowerCase() === regulator.toLowerCase() && (
        <div>
          <h2>Free Allocation (Regulator Only)</h2>
          <form onSubmit={handleFreeAllocation}>
            <label>
              Industry Address:{" "}
              <input
                type="text"
                value={allocationIndustry}
                onChange={(e) => setAllocationIndustry(e.target.value)}
                placeholder="Enter industry address"
              />
            </label>
            <br />
            <label>
              Industry Index:{" "}
              <input
                type="number"
                value={allocationIndex}
                onChange={(e) => setAllocationIndex(e.target.value)}
                placeholder="Enter industry index"
              />
            </label>
            <br />
            <label>
              Credits:{" "}
              <input
                type="number"
                value={allocationCredits}
                onChange={(e) => setAllocationCredits(e.target.value)}
                placeholder="Enter credits to allocate"
              />
            </label>
            <br />
            <button type="submit">Allocate Credits</button>
          </form>
          {allocationStatus && <p>{allocationStatus}</p>}
        </div>
      )}

      <hr />

      {/* Auction Section */}
      <div>
        <h2>Auction Details</h2>
        <p><strong>Credits Available:</strong> {auctionInfo.creditsAvailable}</p>
        <p><strong>Minimum Bid Price (wei):</strong> {auctionInfo.minBidPrice}</p>
        <p><strong>Auction Active:</strong> {auctionInfo.isActive ? "Yes" : "No"}</p>
      </div>

      {account.toLowerCase() === regulator.toLowerCase() && (
        <div>
          <h2>Create Auction (Regulator Only)</h2>
          <form onSubmit={handleCreateAuction}>
            <label>
              Credits Available:{" "}
              <input
                type="number"
                value={auctionCredits}
                onChange={(e) => setAuctionCredits(e.target.value)}
                placeholder="Enter credits available"
              />
            </label>
            <br />
            <label>
              Minimum Bid Price (wei):{" "}
              <input
                type="number"
                value={minBidPrice}
                onChange={(e) => setMinBidPrice(e.target.value)}
                placeholder="Enter min bid price"
              />
            </label>
            <br />
            <button type="submit">Create Auction</button>
          </form>
        </div>
      )}

      <div>
        <h2>Place a Bid (All Users)</h2>
        <form onSubmit={handlePlaceBid}>
          <label>
            Bid Credits:{" "}
            <input
              type="number"
              value={bidCredits}
              onChange={(e) => setBidCredits(e.target.value)}
              placeholder="Enter bid credits"
            />
          </label>
          <button type="submit">Place Bid</button>
        </form>
        {bidStatus && <p>{bidStatus}</p>}
      </div>

      {account.toLowerCase() === regulator.toLowerCase() && (
        <div>
          <h2>Finalize Auction (Regulator Only)</h2>
          <button onClick={handleFinalizeAuction}>Finalize Auction</button>
          {auctionStatus && <p>{auctionStatus}</p>}
        </div>
      )}
    </div>
  );
}

export default App;

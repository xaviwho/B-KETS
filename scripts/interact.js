const hre = require("hardhat");

async function main() {
  const contractAddress = "0x2e5B26395C76FaEa7e45C19aE770624B38A81C21"; // Replace with actual address
  const KETSBlockchain = await hre.ethers.getContractFactory("KETSBlockchain");
  const kets = await KETSBlockchain.attach(contractAddress);

  const regulator = await kets.regulator();
  console.log("✅ Regulator Address:", regulator);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

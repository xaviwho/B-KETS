const hre = require("hardhat");

async function main() {
  const contractAddress = "0x16b3F2768f7a3ddbd1A2396012fe5806D0614a54"; // Replace with actual address
  const KETSBlockchain = await hre.ethers.getContractFactory("KETSBlockchain");
  const kets = await KETSBlockchain.attach(contractAddress);

  const regulator = await kets.regulator();
  console.log("✅ Regulator Address:", regulator);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

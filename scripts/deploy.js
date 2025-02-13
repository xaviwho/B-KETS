// deploy.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ethers.formatUnits(balance, 18), "ETH");

  const KETSBlockchain = await ethers.getContractFactory("KETSBlockchain");

  // Deploy the contract
  const kets = await KETSBlockchain.deploy();

  // Wait for the contract to be deployed (ethers v6)
  await kets.waitForDeployment();

  // Log the address of the deployed contract (using the 'target' property)
  console.log(`KETSBlockchain deployed to: ${kets.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

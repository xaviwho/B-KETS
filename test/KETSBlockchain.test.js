const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KETSBlockchain", function () {
  let ketsInstance;
  let regulator, industry1, industry2;

  // Deploy a fresh instance before each test.
  beforeEach(async function () {
    // Retrieve signers from ethers.
    [regulator, industry1, industry2] = await ethers.getSigners();

    // Deploy the contract using the regulator as the deployer.
    const KETSBlockchainFactory = await ethers.getContractFactory("KETSBlockchain", regulator);
    ketsInstance = await KETSBlockchainFactory.deploy();
    await ketsInstance.waitForDeployment();
  });

  it("✅ Should deploy the smart contract & set the regulator", async function () {
    const contractOwner = await ketsInstance.regulator();
    expect(contractOwner).to.equal(regulator.address);
  });

  it("✅ Should allow industry registration", async function () {
    // Have industry1 register itself.
    await ketsInstance.connect(industry1).registerIndustry("Industry A", true);
    // Assuming the industries mapping is declared public, ethers auto-generates a getter that expects an address.
    const industry = await ketsInstance.industries(industry1.address);
    expect(industry.name).to.equal("Industry A");
    expect(industry.isRegistered).to.equal(true);
  });

  it("✅ Should issue free allocation correctly", async function () {
    // First register industry1 since freeAllocation likely requires the industry to be registered.
    await ketsInstance.connect(industry1).registerIndustry("Industry A", true);
    // Then call freeAllocation as the regulator.
    await ketsInstance.connect(regulator).freeAllocation(industry1.address, 100);
    const industry = await ketsInstance.industries(industry1.address);
    // Compare as strings because creditsOwned is likely a BigNumber.
    expect(industry.creditsOwned.toString()).to.equal("100");
  });

  it("✅ Should allow credit trading between industries", async function () {
    // Register both industries.
    await ketsInstance.connect(industry1).registerIndustry("Industry A", true);
    await ketsInstance.connect(industry2).registerIndustry("Industry B", false);
    // Issue free allocation to industry1 so it has credits.
    await ketsInstance.connect(regulator).freeAllocation(industry1.address, 100);
    // Trade 50 credits from industry1 to industry2.
    await ketsInstance.connect(industry1).tradeCredits(industry2.address, 50);
    const industryA = await ketsInstance.industries(industry1.address);
    const industryB = await ketsInstance.industries(industry2.address);
    expect(industryA.creditsOwned.toString()).to.equal("50");
    expect(industryB.creditsOwned.toString()).to.equal("50");
  });

  it("✅ Should start an auction correctly", async function () {
    // Start an auction using the regulator account.
    await ketsInstance.connect(regulator).createAuction(500, 1);
    const auction = await ketsInstance.currentAuction();
    expect(auction.creditsAvailable.toString()).to.equal("500");
    expect(auction.isActive).to.equal(true);
  });

  it("✅ Should place bids in auction", async function () {
  // Start an auction.
  await ketsInstance.connect(regulator).createAuction(500, 1);
  // Register industry1.
  await ketsInstance.connect(industry1).registerIndustry("Industry A", true);
  // Allocate some credits to industry1 (e.g., 100 credits).
  await ketsInstance.connect(regulator).freeAllocation(industry1.address, 100);
  // Now place a bid of 10 credits from industry1.
  await ketsInstance.connect(industry1).placeBid(10);

  // Optionally, verify the bid by reading a public variable or using a getter function.
  // For example, if there's a getter function getBid(address):
  // const bid = await ketsInstance.getBid(industry1.address);
  // expect(bid.toString()).to.equal("10");
  });
});

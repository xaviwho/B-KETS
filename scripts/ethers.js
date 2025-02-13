const { ethers } = require("hardhat");

async function main() {
    try {
        const signers = await ethers.getSigners();
        const balance = await ethers.provider.getBalance(signers[0].address);
        console.log(ethers.utils.formatEther(balance), "ETH");
    } catch (error) {
        console.error("Error:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
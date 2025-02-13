/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.10",
  networks: {
    purechain: {
      url: "http://43.200.53.250:8548",
      accounts: ["a471850a08d06bcc47850274208275f1971c9f5888bd0a08fbc680ed9701cfda"],
      gas: 300000,
      gasPrice: 0,
    },
  },
};

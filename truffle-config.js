module.exports = {
    networks: {
      development: {
        host: "127.0.0.1", // Ganache local blockchain
        port: 7545,        // Default Ganache port
        network_id: "*",   // Match any network id
      },
    },
    compilers: {
      solc: {
        version: "0.8.10", // Ensure Solidity compiler matches your contract
      },
    },
  };
  
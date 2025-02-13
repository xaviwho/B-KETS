const KETSBlockchain = artifacts.require("KETSBlockchain");

module.exports = function (deployer) {
  deployer.deploy(KETSBlockchain);
};

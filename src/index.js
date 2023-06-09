const ethers = require('ethers');
const FunderDepository = require('../artifacts/contracts/FunderDepository.sol/FunderDepository.json');

function computeFunderDepositoryAddress(funderAddress, owner, root) {
  const initcode = ethers.utils.solidityPack(
    ['bytes', 'bytes'],
    [FunderDepository.bytecode, ethers.utils.defaultAbiCoder.encode(['address', 'bytes32'], [owner, root])]
  );
  return ethers.utils.getCreate2Address(funderAddress, ethers.constants.HashZero, ethers.utils.keccak256(initcode));
}

module.exports = {
  computeFunderDepositoryAddress,
};

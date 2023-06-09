const fs = require('fs');
const { deployments, ethers, network } = require('hardhat');
const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');
const { computeFunderDepositoryAddress } = require('../src/index');

async function main() {
  const config = JSON.parse(fs.readFileSync('./config/config.json'));
  // It would be good to validate the config here, for example, to check if there are duplicate recipients
  const Funder = await deployments.get('Funder');
  const funder = new ethers.Contract(Funder.address, Funder.abi, (await ethers.getSigners())[0]);
  await Promise.all(
    config.funderDepositories[network.config.chainId.toString()].map(async (funderDepository) => {
      const treeValues = funderDepository.values.map((funderDepositoryValue) => [
        funderDepositoryValue.recipient,
        ethers.utils.parseUnits(
          funderDepositoryValue.lowThreshold.value.toString(),
          funderDepositoryValue.lowThreshold.unit
        ),
        ethers.utils.parseUnits(
          funderDepositoryValue.highThreshold.value.toString(),
          funderDepositoryValue.highThreshold.unit
        ),
      ]);
      const tree = StandardMerkleTree.of(treeValues, ['address', 'uint256', 'uint256']);
      const funderDepositoryAddress = computeFunderDepositoryAddress(funder.address, funderDepository.owner, tree.root);
      if ((await ethers.provider.getCode(funderDepositoryAddress)) === '0x') {
        await funder.deployFunderDepository(funderDepository.owner, tree.root);
        console.log(`FunderDepository is deployed at ${funderDepositoryAddress}`);
      } else {
        console.log(`FunderDepository is already deployed at ${funderDepositoryAddress}`);
      }
      const funderDepositoryBalance = await ethers.provider.getBalance(funderDepositoryAddress);
      const targetBalance = ethers.utils.parseUnits('100', 'ether');
      if (funderDepositoryBalance.lt(targetBalance)) {
        await (
          await ethers.getSigners()
        )[0].sendTransaction({
          to: funderDepositoryAddress,
          value: targetBalance.sub(funderDepositoryBalance),
        });
        console.log(`Topped the FunderDepository at ${funderDepositoryAddress} up to 100 ETH`);
      }
    })
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

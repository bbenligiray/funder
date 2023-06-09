const fs = require('fs');
const { deployments, ethers, network } = require('hardhat');
const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');

async function main() {
  const config = JSON.parse(fs.readFileSync('./config/config.json'));
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
      // A potential improvement here is to batch the calls in case the tree has hundred of values
      const multicallCalldata = funderDepository.values.map((funderDepositoryValue, treeValueIndex) => {
        return funder.interface.encodeFunctionData('fund', [
          funderDepository.owner,
          tree.root,
          tree.getProof(treeValueIndex),
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
      });
      const { successes } = await funder.callStatic.tryMulticall(multicallCalldata);
      const successfulMulticallCalldata = successes.reduce((acc, success, successIndex) => {
        if (success) {
          acc.push(multicallCalldata[successIndex]);
        }
        return acc;
      }, []);
      if (successfulMulticallCalldata.length > 0) {
        // We still try-multicall in case a recipient is funded by someone else in the meantime
        await funder.tryMulticall(successfulMulticallCalldata);
        console.log(`Funding ${successfulMulticallCalldata.length} recipients`);
      } else {
        console.log('Recipients are already funded');
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

module.exports = async ({ deployments, ethers, getUnnamedAccounts }) => {
  const { deploy, log } = deployments;
  const accounts = await getUnnamedAccounts();

  const funder = await deploy('Funder', {
    from: accounts[0],
    log: true,
    deterministicDeployment: process.env.DETERMINISTIC ? ethers.constants.HashZero : undefined,
  });
  log(`Deployed Funder at ${funder.address}`);
};

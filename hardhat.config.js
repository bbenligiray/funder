require('@nomicfoundation/hardhat-toolbox');
require('hardhat-deploy');

module.exports = {
  networks: {
    localhost: {
      chainId: 31337,
    },
  },
  solidity: '0.8.17',
};

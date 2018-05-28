const HDWalletProvider = require('truffle-hdwallet-provider');
const Web3 = require('web3');

const provider = new HDWalletProvider(
    'fill this',
    'fill this'
);

const web3 = new Web3(provider);

const compiledFundingHubContract = require('../ethereum/build/FundingHub.json');

const deploy = async () => {
    const accounts = await web3.eth.getAccounts();

    console.log('Deployment starting using the account ', accounts[0]);
    try {
        const result = await new web3.eth.Contract(JSON.parse(compiledFundingHubContract.interface))
            .deploy({ data: '0x'+compiledFundingHubContract.bytecode })
            .send({ from: accounts[0], gas: '1000000' });

        console.log('Funding Hub contract deployed at ', result.options.address);
    } catch (error) {
        console.log('unable to deploy contraact', error);
    }
};

deploy();
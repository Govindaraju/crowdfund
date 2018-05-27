
const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');

const web3 = new Web3(ganache.provider());

const compiledFundingHubContract = require('../ethereum/build/FundingHub.json');
const compileProjectContract = require('../ethereum/build/Project.json');

require('events').EventEmitter.prototype._maxListeners = 100;

let accounts;
let fundingHub;
let projectAddress;
let project;

beforeEach(async () => {
    accounts = await web3.eth.getAccounts();

    fundingHub = await new web3.eth.Contract(JSON.parse(compiledFundingHubContract.interface))
        .deploy({ data: compiledFundingHubContract.bytecode })
        .send({ from: accounts[0], gas: '1000000' });
});

describe('Verify Deployment and Project Creation', () => {

    it('FundingHub contract deployed and a new Project is created', () => {
        assert.ok(fundingHub.options.address);
    });

    it('There should be exactly one project created ', async () => {
        await createProject(accounts[0], 1000, 2);
        const count = await fundingHub.methods.countOfProjects().call();
        assert.equal(count, 1);
    })
});

describe('Projects', () => {
    it('should get created with anticipated attributes', async () => {
        await createProject(accounts[1], 200, 2);
        const result = await project.methods.completeDetails().call();
        assertProjectDetails(result, accounts[1], 200, 1, true, 0);
    });

    it('should be able to fund the project when funding goal is not reached', async () => {

        await project.methods.fund().send({
            from: accounts[2],
            gas: '1000000',
            value: '100'
        });
        const result = await project.methods.completeDetails().call();
        assertProjectDetails(result, accounts[1], 200, 1, true, 100);
    });

    it('should not be able to fund the project when funding goal is reached', async () => {
        await createProject(accounts[0], 300, 5);

        try {
            await project.methods.fund().send({
                from: accounts[2],
                gas: '1000000',
                value: '300'
            });
            let result = await project.methods.completeDetails().call();
            assertProjectDetails(result, accounts[0], 300, 4, false, 0);

        } catch (error) {
            assert(false);
        }

        try {
            await project.methods.fund().send({
                from: accounts[2],
                gas: '1000000',
                value: '300'
            });
            assert(false);
        } catch (error) {
            assert(true);
        }
        result = await project.methods.completeDetails().call();
        assertProjectDetails(result, accounts[0], 300, 4, false, 0);
    });

    it('payout of fund should happen when funding goal is reached', async () => {
        await createProject(accounts[0], 1000000000000, 5);

        const balanceBefore = await web3.eth.getBalance(accounts[0]);

        try {
            await project.methods.fund().send({
                from: accounts[2],
                gas: '1000000',
                value: '1000000000000'
            });
            let result = await project.methods.completeDetails().call();
            assertProjectDetails(result, accounts[0], 1000000000000, 4, false, 0);

            const balanceAfter = await web3.eth.getBalance(accounts[0]);

            assert(balanceAfter > balanceBefore);

        } catch (error) {
            assert(false);
        }
    });
});



async function createProject(fromAddress, amountToBeRaised, expiryTime) {
    await fundingHub.methods.createProject(amountToBeRaised, expiryTime)
        .send({ from: fromAddress, gas: '1000000' });

    [projectAddress] = await fundingHub.methods.getAllProjects().call();

    project = await new web3.eth.Contract(
        JSON.parse(compileProjectContract.interface),
        projectAddress
    );
}

function assertProjectDetails(result, account, amountToBeRaised, daysBeforeExpiry, status, amountRaisedSoFar) {
    console.log(result);
    assert.equal(result[0], account, 'first element of the returned value should be the beneficiary aka the creater of the project');
    assert.equal(result[1], amountToBeRaised, 'second element of the returned value should be the amount to be raised');
    assert(parseInt(result[2]) >= parseInt(daysBeforeExpiry), 'third element of the returned value should be the no of days before expiry');
    assert.equal(result[3], status, 'fourth element of the returned value shold be the status of the project(open or closed)');
    assert.equal(result[4], amountRaisedSoFar, 'fourth element of the returned value should be the amount raised so far');

}
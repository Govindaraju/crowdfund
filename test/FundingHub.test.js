
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
        await createProject(accounts[0], 1000, toSecondsFromDays(2));
        const count = await fundingHub.methods.countOfProjects().call();
        assert.equal(count, 1);
    })
});

describe('Projects', () => {
    it('should get created with anticipated attributes', async () => {
        const time = toSecondsFromDays(2);
        await createProject(accounts[1], 20, toSecondsFromDays(2));
        const result = await project.methods.completeDetails().call();
        assertProjectDetails(result, accounts[1], toWei('20'), toSecondsFromDays(1), true, 0);
    });

    it('should be able to fund the project when funding goal is not reached', async () => {

        await project.methods.fund().send({
            from: accounts[2],
            gas: '1000000',
            value: toWei('5')
        });
        const result = await project.methods.completeDetails().call();
        assertProjectDetails(result, accounts[1], toWei('20'), toSecondsFromDays(1), true, toWei('5'));
    });

    it('should not be able to fund the project when funding goal is reached', async () => {
        await createProject(accounts[0], 15, toSecondsFromDays(5));

        try {
            await project.methods.fund().send({
                from: accounts[2],
                gas: '1000000',
                value: toWei('15')
            });
            let result = await project.methods.completeDetails().call();
            assertProjectDetails(result, accounts[0], toWei('15'), toSecondsFromDays(4), false, 0);

        } catch (error) {
            assert(false);
        }

        try {
            await project.methods.fund().send({
                from: accounts[2],
                gas: '1000000',
                value: toWei('2')
            });
            assert(false, 'invalid test case execution step');
        } catch (error) {
            assert(true);
        }
        result = await project.methods.completeDetails().call();
        assertProjectDetails(result, accounts[0], toWei('15'), toSecondsFromDays(4), false, 0);
    });

    it('payout of fund should happen when funding goal is reached', async () => {
        await payoutScenario(accounts[0], accounts[2], toSecondsFromDays(5), toSecondsFromDays(4));
    });

    it('should not allow contributors to withdraw funds once payout is done', async () => {
        await payoutScenario(accounts[0], accounts[2], toSecondsFromDays(5), toSecondsFromDays(4));

        try {
            await project.methods.withdraw().send({
                from: accounts[4]
            });
            assert(false, 'invalid test case execution step');
        } catch (error) {
            assert(true);
        }
    });

  

    it('should allow contributors to withdraw funds when the project has expired before reaching the funding goal', async () => {
        assert(true,'yet to be implemented');
    });

    it('should not allow contributors to withdraw funds when the project has not yet expired', async () => {
        await createProject(accounts[0], 300, 5);

        const contributor = accounts[3];

        await project.methods.fund().send({
            from: contributor,
            gas: '1000000',
            value: web3.utils.toWei('5', 'ether')
        });

        setTimeout(async () => {

            try {
                await project.methods.withdraw().send({
                    from: contributor,
                    gas: '1000000',
                });
                assert(false, 'invalid test case execution step');

            } catch (error) {
                assert(true);
            }
        }, 3000);

    });
});

async function payoutScenario(beneficiary, contributor, expiryTime, pendingTimeBeforeExpiry) {
    await createProject(beneficiary, 22, expiryTime);
    const balanceBefore = await web3.eth.getBalance(beneficiary);

    try {
        await project.methods.fund().send({
            from: contributor,
            gas: '1000000',
            value: toWei('22')
        });
        let result = await project.methods.completeDetails().call();
        assertProjectDetails(result, beneficiary, toWei('22'), pendingTimeBeforeExpiry, false, 0);

        const balanceAfter = await web3.eth.getBalance(beneficiary);
        assert(parseInt(balanceAfter) > parseInt(balanceBefore));

    } catch (error) {
        assert(false);
    }
}

async function createProject(fromAddress, amountToBeRaised, expiryTime) {
    await fundingHub.methods.createProject(amountToBeRaised, expiryTime)
        .send({ from: fromAddress, gas: '1000000' });

    [projectAddress] = await fundingHub.methods.getAllProjects().call();

    project = await new web3.eth.Contract(
        JSON.parse(compileProjectContract.interface),
        projectAddress
    );
}

function assertProjectDetails(result, account, amountToBeRaised, secondsBeforeExpiry, status, amountRaisedSoFar) {
    assert.equal(result[0], account, 'first element of the returned value should be the beneficiary aka the creater of the project');
    assert.equal(result[1], amountToBeRaised, 'second element of the returned value should be the amount to be raised');
    assert(parseInt(result[2]) >= secondsBeforeExpiry, 'third element of the returned value should be the no of seconds before expiry');
    assert.equal(result[3], status, 'fourth element of the returned value shold be the status of the project(open or closed)');
    assert.equal(result[4], amountRaisedSoFar, 'fourth element of the returned value should be the amount raised so far');

}

function toSecondsFromDays(days) {
    const time = days * 24 * 60 * 60 * 1000;
    return time;
}

function toWei(valueInEther){
    return web3.utils.toWei(valueInEther,'ether');
}


const Bluebird = require("bluebird");
const request = require("request-promise");
const _ = require("lodash");

const { waitForContractEvent } = require("../lib/utils");

const EthToUsdOracle = artifacts.require("./EthToUsdOracle.sol");

contract("EthToUsdOracle", function(accounts) {

  describe("ETH to USD exchange rate", function() {

    it("should set the price of an ETH in hundred-thousandth of a cent USD when contract is created ($308.56893 -> 30856893)", async function() {
      let owner = accounts[0];
      let oracleBalance = web3.toWei(0.1, "ether");
      let oracle = await EthToUsdOracle.new(true, {
        from: owner,
        value: oracleBalance
      });

      let requestEvent = await waitForContractEvent(oracle, "NewOraclizeQuery");
      let event = await waitForContractEvent(oracle, "ETHPriceUpdated");
      let offChainEthDetails = await request("https://api.kraken.com/0/public/Ticker?pair=ETHUSD", { json: true });
      let offChainPrice = Math.round(parseFloat(offChainEthDetails.result.XETHZUSD.c[0]) * 100000);

      let onChainPrice = await oracle.ETHUSD();
      let lastUpdate = await oracle.lastUpdate();
      onChainPrice = onChainPrice.toNumber();

      assert.ok(Math.abs(offChainPrice - onChainPrice) / onChainPrice < 0.01, "the oracle returns the current ETH price in USD cents");
      assert.equal(event.event, "ETHPriceUpdated", "The event is correct");
      assert.equal(Math.round(parseFloat(event.args.price) * 100000), onChainPrice , "The event price is correct");
      assert.ok(lastUpdate.toNumber(), "The last update time was set");
      assert.equal(requestEvent.event, "NewOraclizeQuery", "the oraclize request event was issued");
    });

    it("should automatically update the ETH price", async function() {
      let owner = accounts[0];
      let oracleBalance = web3.toWei(0.1, "ether");
      let oracle = await EthToUsdOracle.new(true, {
        from: owner,
        value: oracleBalance
      });

      let firstEvent = await waitForContractEvent(oracle, "ETHPriceUpdated");
      let firstUpdateTime = await oracle.lastUpdate();

      await oracle.setUpdateFrequency(2);

      await new Bluebird.Promise(res => setTimeout(() => res(), 500));

      let secondEvent = await waitForContractEvent(oracle, "ETHPriceUpdated");
      let secondUpdateTime = await oracle.lastUpdate();

      assert.notEqual(firstEvent.blockNumber, secondEvent.blockNumber, "The price update block heights are different");
      assert.notEqual(firstUpdateTime.toNumber(), secondUpdateTime.toNumber(), "The price update times are different");

      await oracle.setUpdateFrequency(3600); // be kind to the local oraclize, as recursive updates can't be cancelled
    });

    it("should not update the price faster than updateFrequencySeconds", async function() {
      let owner = accounts[0];
      let oracleBalance = web3.toWei(0.1, "ether");
      let oracle = await EthToUsdOracle.new(true, {
        from: owner,
        value: oracleBalance
      });

      await waitForContractEvent(oracle, "ETHPriceUpdated");

      await new Bluebird.Promise(res => setTimeout(() => res(),  500));

      let updateTxn = await oracle.update(0);

      let nothing = await waitForContractEvent(oracle, "ETHPriceUpdated", 30)
        .then(() => assert.ok(false, "Expect timeout exception waiting for event that is never fired"))
        .catch(() => { /* expect timeout exception  */});

      assert.isUndefined(nothing, "no price update event was received");
      assert.equal(_.filter(updateTxn.logs, { event: "ETHPriceUpdated" }).length, 0, 'No price event was logged in update txn');
    });


    it("should fire an OraclizeQueryNotEnoughFunds event if there is not enough balance to fund the call to get a price update", async function() {
      let oracle = await EthToUsdOracle.new(true);

      await waitForContractEvent(oracle, "ETHPriceUpdated"); // Oraclize uses gas from the contract creation for the first request
      let lastUpdate = await oracle.lastUpdate();
      let ethPrice = await oracle.ETHUSD();

      await oracle.setUpdateFrequency(2);
      await new Bluebird.Promise(res => setTimeout(() => res(), 5 * 1000));

      let updateTxn = await oracle.update(0);

      let unchangedLastUpdate = await oracle.lastUpdate();
      let unchangedEthPrice = await oracle.ETHUSD();

      assert.equal(updateTxn.logs.length, 1, 'There is an event');
      assert.equal(updateTxn.logs[0].event, "OraclizeQueryNotEnoughFunds", "the not enough funds event was fired");
      assert.equal(lastUpdate.toNumber(), unchangedLastUpdate.toNumber(), "The price update date did not change");
      assert.equal(ethPrice.toNumber(), unchangedEthPrice.toNumber(), "The price did not change");

      await oracle.setUpdateFrequency(3600); // be kind to the local oraclize, as recursive updates can't be cancelled
    });

    it("should not allow callback function to be invoked by non-oraclize address", async function() {
      let owner = accounts[0];
      let oracleBalance = web3.toWei(0.1, "ether");
      let oracle = await EthToUsdOracle.new(true, {
        from: owner,
        value: oracleBalance
      });

      await waitForContractEvent(oracle, "ETHPriceUpdated");

      let exceptionThrown;
      try {
        await oracle.__callback("0x3a6c8157a8dc8bda28e5ed2023653a6b080b17696add3481dee168b367a8a15b","306.18988","QmfNEh4BBredUiyvg9MKv34QxAeLm5Spir72ifv5geysT2");
      } catch (e) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "exception is thrown invoking the oraclize callback");
    });

    it("should not allow non-owner be able to change the update frequency", async function() {
      let owner = accounts[0];
      let nonOwner = accounts[1];
      let oracleBalance = web3.toWei(0.1, "ether");
      let oracle = await EthToUsdOracle.new(true, {
        from: owner,
        value: oracleBalance
      });

      await waitForContractEvent(oracle, "ETHPriceUpdated");

      let exceptionThrown;
      try {
        await oracle.setUpdateFrequency(2, {
          from: nonOwner
        });
      } catch (e) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "exception is thrown when non-owner tries to change update frequency");

      let updateFrequencySeconds = await oracle.updateFrequencySeconds();

      assert.equal(updateFrequencySeconds.toNumber(), 3600, 'the update frequency is set to the default value');
    });

    it("should not allow update frequency to be set to 0 sec", async function() {
      let owner = accounts[0];
      let oracleBalance = web3.toWei(0.1, "ether");
      let oracle = await EthToUsdOracle.new(true, {
        from: owner,
        value: oracleBalance
      });

      await waitForContractEvent(oracle, "ETHPriceUpdated");

      let exceptionThrown;
      try {
        await oracle.setUpdateFrequency(0);
      } catch (e) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "exception is thrown when update frequency is set to 0");

      let updateFrequencySeconds = await oracle.updateFrequencySeconds();

      assert.equal(updateFrequencySeconds.toNumber(), 3600, 'the update frequency is set to the default value');
    });

  });

});

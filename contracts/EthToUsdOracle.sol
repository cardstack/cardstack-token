/*
   Kraken-based ETH/XBT price ticker

   This contract keeps in storage an updated ETH/XBT price,
   which is updated every ~60 seconds.
 */

pragma solidity ^0.4.0;
import "./oraclize/ethereum-api/oraclizeAPI.sol";

contract EthToUsdOracle is usingOraclize {

  uint public ETHUSD;

  event newOraclizeQuery(string description);
  event newPriceTicker(string price);

  function EthToUsdOracle() {
    // This is necessary for unit tests.
    // TODO need to figure out a way to only set this in test and not in production
    OAR = OraclizeAddrResolverI(0x6f485C8BF6fc43eA212E93BBF8ce046C7f1cb475);

    // FIXME: enable oraclize_setProof is production
    // oraclize_setProof(proofType_TLSNotary | proofStorage_IPFS);
    update(0);
  }

  function __callback(bytes32 myid, string result, bytes proof) {
    if (msg.sender != oraclize_cbAddress()) throw;
    newPriceTicker(result);
    ETHUSD = parseInt(result, 2); // save it in storage as $ cents
    // do something with ETHUSD
    // update(60); // FIXME: comment this out to enable recursive price updates
  }

  function update(uint delay) payable {
    if (oraclize_getPrice("URL") > this.balance) {
      newOraclizeQuery("Oraclize query was NOT sent, please add some ETH to cover for the query fee");
    } else {
      newOraclizeQuery("Oraclize query was sent, standing by for the answer..");
      oraclize_query(delay, "URL", "json(https://api.kraken.com/0/public/Ticker?pair=ETHUSD).result.XETHZUSD.c.0");
    }
  }
}

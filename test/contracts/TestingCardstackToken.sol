pragma solidity ^0.4.24;

import "../../contracts/CardstackToken.sol";

contract TestingCardstackToken is CardstackToken {
  address internal constant testingInitializer = 0xEa58Ed38E27dDD7Cf1c6e765B1d61CFC2AE3036E;

  function initialize(address _registry, string _storageName, string _ledgerName) public {
    owner = testingInitializer;
    _initialize(_registry, _storageName, _ledgerName);
  }
}

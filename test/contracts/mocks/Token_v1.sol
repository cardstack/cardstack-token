pragma solidity ^0.4.24;

import "../TestingCardstackToken.sol";

contract Token_v1 is TestingCardstackToken {
  function getVersion() public pure returns (string) {
    return "v1";
  }
}

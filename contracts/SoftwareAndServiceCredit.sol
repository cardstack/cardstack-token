pragma solidity ^0.4.2;

import "./owned.sol";
import "./freezable.sol";

contract SoftwareAndServiceCredit is owned, freezable {

  mapping (address => uint) public balanceOf;
  mapping (address => uint) public lastPurchaseBlockHeight;

  // TODO only the owner and the CSTtoSSC contract can invoke this function
  // make sure to account for the fact that the CSTtoSSC contract can change addresses
  function issueSSC(address recipient, uint amount) {
  }

  function setCSTtoSSCAddress(address cstToSSCAddress) onlyOwner {
  }
}

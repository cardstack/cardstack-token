pragma solidity ^0.4.13;
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract CstToSsc is Ownable {
  uint256 public rewardPool;

  function buySSC(uint256 cstAmount) {
    // 1. convert CST to USD using CST buy price and ETH to USD oracle
    // 2. transfer CST to the owner of this contract
    // 3. increment rewardPool with the CST received
    // 4. issue SSC
  }
}

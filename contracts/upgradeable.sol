pragma solidity ^0.4.18;

import "./administratable.sol";

contract upgradeable is administratable {
  address public predecessor;
  address public successor;

  event Upgraded(address indexed successor);
  event UpgradedFrom(address indexed predecessor);
  event Transfer(address indexed _from, address indexed _to, uint256 _value);

  modifier unlessUpgraded() {
    if (successor != 0x0) revert();
    _;
  }

  modifier isUpgraded() {
    if (successor == 0x0) revert();
    _;
  }

  modifier hasPredecessor() {
    if (predecessor == 0x0) revert();
    _;
  }

  function isDeprecated() public view returns (bool) {
    return successor != 0x0;
  }

  function upgradeTo(address _successor, uint256 remainingContractBalance) public onlySuperAdmins unlessUpgraded returns (bool){
    successor = _successor;
    if (remainingContractBalance > 0) {
      Transfer(this, _successor, remainingContractBalance);
    }

    Upgraded(_successor);
    return true;
  }

  function upgradedFrom(address _predecessor) public onlySuperAdmins returns (bool) {
    require(_predecessor != 0x0);

    predecessor = _predecessor;

    UpgradedFrom(_predecessor);
    return true;
  }
}

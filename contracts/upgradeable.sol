pragma solidity ^0.4.24;

import "./administratable.sol";
import "./ERC20.sol";

contract upgradeable is administratable {
  address public predecessor;
  address public successor;
  bool public isTokenContract;
  string public version;

  event Upgraded(address indexed successor);
  event UpgradedFrom(address indexed predecessor);
  event Transfer(address indexed _from, address indexed _to, uint256 _value);

  modifier unlessUpgraded() {
    if (msg.sender != successor && successor != address(0)) revert();
    _;
  }

  modifier isUpgraded() {
    if (successor == address(0)) revert();
    _;
  }

  modifier hasPredecessor() {
    if (predecessor == address(0)) revert();
    _;
  }

  function isDeprecated() public view returns (bool) {
    return successor != address(0);
  }

  function upgradeTo(address _successor, uint256 remainingContractBalance) public onlySuperAdmins unlessUpgraded returns (bool){
    require(_successor != address(0));
    successor = _successor;
    if (remainingContractBalance > 0) {
      emit Transfer(this, _successor, remainingContractBalance);
    }

    emit Upgraded(_successor);
    return true;
  }

  function upgradedFrom(address _predecessor) public onlySuperAdmins returns (bool) {
    require(_predecessor != address(0));

    predecessor = _predecessor;

    emit UpgradedFrom(_predecessor);

    // TODO refactor this into registry contract when ready for registry upgrade
    if (upgradeable(_predecessor).predecessor() != address(0)) {
      if (upgradeable(_predecessor).isTokenContract()) {
        emit Transfer(_predecessor, this, ERC20(_predecessor).balanceOf(_predecessor));
      }
    } else {
      emit Transfer(this, this, 0); // make etherscan see this as an ERC-20. lets remove in v3
    }

    return true;
  }
}

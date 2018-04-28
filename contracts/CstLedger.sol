pragma solidity ^0.4.23;

import "./administratable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

interface ITokenLedger {
  function totalTokens() external view returns (uint256);
  function totalInCirculation() external view returns (uint256);
  function balanceOf(address account) external view returns (uint256);
  function mintTokens(uint256 amount) external;
  function transfer(address sender, address reciever, uint256 amount) external;
  function creditAccount(address account, uint256 amount) external;
  function debitAccount(address account, uint256 amount) external;
  function addAdmin(address admin) external;
  function removeAdmin(address admin) external;
}

contract CstLedger is ITokenLedger, administratable {

  using SafeMath for uint256;

  uint256 private _totalInCirculation; // warning this does not take into account unvested nor vested-unreleased tokens into consideration
  uint256 private _totalTokens;
  mapping (address => uint256) private _balanceOf;
  mapping (address => bool) private accounts;
  address[] public accountForIndex;

  function totalTokens() external view returns (uint256) {
    return _totalTokens;
  }

  function totalInCirculation() external view returns (uint256) {
    return _totalInCirculation;
  }

  function balanceOf(address account) external view returns (uint256) {
    return _balanceOf[account];
  }

  function mintTokens(uint256 amount) external onlyAdmins {
    _totalTokens = _totalTokens.add(amount);
  }

  function ledgerCount() external view returns (uint256) {
    return accountForIndex.length;
  }

  function makeAccountIterable(address account) internal {
    if (!accounts[account]) {
      accountForIndex.push(account);
      accounts[account] = true;
    }
  }

  function transfer(address sender, address recipient, uint256 amount) external onlyAdmins {
    require(sender != address(0));
    require(recipient != address(0));
    require(_balanceOf[sender] >= amount);

    _balanceOf[sender] = _balanceOf[sender].sub(amount);
    _balanceOf[recipient] = _balanceOf[recipient].add(amount);
    makeAccountIterable(recipient);
  }

  function creditAccount(address account, uint256 amount) external onlyAdmins { // remove tokens
    require(account != address(0));
    require(_balanceOf[account] >= amount);

    _totalInCirculation = _totalInCirculation.sub(amount);
    _balanceOf[account] = _balanceOf[account].sub(amount);
  }

  function debitAccount(address account, uint256 amount) external onlyAdmins { // add tokens
    require(account != address(0));
    _totalInCirculation = _totalInCirculation.add(amount);
    _balanceOf[account] = _balanceOf[account].add(amount);
    makeAccountIterable(account);
  }
}

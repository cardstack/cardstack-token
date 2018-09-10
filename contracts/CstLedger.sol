pragma solidity 0.4.24;

import "./Administratable.sol";
import "./ITokenLedger.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "zos-lib/contracts/migrations/Initializable.sol";

contract CstLedger is ITokenLedger, Initializable, Administratable {

  using SafeMath for uint256;

  /* zOS requires that the variables are never removed nor order changed
  /* BEGIN VARIABLES */
  string public constant version = "2";

  uint256 private _totalInCirculation; // warning this does not take into account unvested nor vested-unreleased tokens into consideration
  uint256 private _totalTokens;
  mapping (address => uint256) private _balanceOf;
  mapping (address => bool) private accounts;
  /* END VARIABLES */

  function transfer(address sender, address recipient, uint256 amount) external onlyAdmins {
    require(sender != address(0));
    require(recipient != address(0));
    require(_balanceOf[sender] >= amount);

    _balanceOf[sender] = _balanceOf[sender].sub(amount);
    _balanceOf[recipient] = _balanceOf[recipient].add(amount);
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
  }

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

  function initialize() public onlyInitializers isInitializer {
    initializeAdmins();
  }

}

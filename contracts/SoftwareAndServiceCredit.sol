pragma solidity ^0.4.2;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./freezable.sol";
import "./administratable.sol";

contract SoftwareAndServiceCredit is Ownable, freezable, administratable {

  using SafeMath for uint256;

  uint public sscExpirationSeconds = 60 * 60 * 24 * 30 * 6; // default to 6 months
  mapping (address => bool) public applicationContracts;
  mapping (address => uint) public balanceOf;
  mapping (address => uint) public lastActiveTime;

  event SSCIssued(address indexed admin, address adminAddress, address indexed recipient, address recipientAddress, uint amount);
  event SSCBurned(address indexed appContract, address appContractAddress, address indexed account, address accountAddress, uint amount);
  event SSCExpired(address indexed appContract, address appContractAddress, address indexed account, address accountAddress, uint amount);

  modifier onlyApplicationContracts {
    if (msg.sender != owner && !admins[msg.sender] && !applicationContracts[msg.sender]) throw;
    _;
  }

  function hasExpired(address account) constant returns (bool) {
    if (lastActiveTime[account] == 0) return false;

    return lastActiveTime[account].add(sscExpirationSeconds) < block.timestamp;
  }

  function burn(address account, uint amount) onlyApplicationContracts unlessFrozen returns (bool) {
    require(!frozenAccount[account]);

    // we expire all the user's SSC after inactivity that lasts longer than the expiration period
    if (hasExpired(account)) {
      uint expiredAmount = balanceOf[account];
      balanceOf[account] = 0;

      SSCExpired(msg.sender, msg.sender, account, account, expiredAmount);
      return false;
    } else {
      require(balanceOf[account] >= amount);

      balanceOf[account] = balanceOf[account].sub(amount);
      lastActiveTime[account] = block.timestamp;

      SSCBurned(msg.sender, msg.sender, account, account, amount);
      return true;
    }
  }

  function issueSSC(address recipient, uint amount) onlyAdmins unlessFrozen {
    require(!frozenAccount[recipient]);

    balanceOf[recipient] = balanceOf[recipient].add(amount);
    lastActiveTime[recipient] = block.timestamp;

    SSCIssued(msg.sender, msg.sender, recipient, recipient, amount);
  }

  // TODO we should look up application contracts from the genesis contract instead of holding all those addresses here
  // this is just temp until we create the genesis contract
  function addApplicationContract(address appContract) onlyAdmins {
    applicationContracts[appContract] = true;
  }

  function removeApplicationContract(address appContract) onlyAdmins {
    delete applicationContracts[appContract];
  }

  function setSscExpiration(uint expirationSec) onlyOwner {
    require(expirationSec > 0);

    sscExpirationSeconds = expirationSec;
  }

}

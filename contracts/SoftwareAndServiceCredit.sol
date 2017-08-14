pragma solidity ^0.4.2;

import "./owned.sol";
import "./freezable.sol";

contract SoftwareAndServiceCredit is owned, freezable {

  uint public sscExpirationSeconds = 60 * 60 * 24 * 30 * 6; // default to 6 months
  mapping (address => bool) public admins;
  mapping (address => bool) public applicationContracts;
  mapping (address => uint) public balanceOf;
  mapping (address => uint) public lastActiveTime;

  event SSCIssued(address indexed admin, address adminAddress, address indexed recipient, address recipientAddress, uint amount);
  event SSCBurned(address indexed appContract, address appContractAddress, address indexed account, address accountAddress, uint amount);
  event SSCExpired(address indexed appContract, address appContractAddress, address indexed account, address accountAddress, uint amount);

  modifier onlyAdmins {
    if (msg.sender != owner && !admins[msg.sender]) throw;
    _;
  }

  modifier onlyApplicationContracts {
    if (msg.sender != owner && !admins[msg.sender] && !applicationContracts[msg.sender]) throw;
    _;
  }

  function hasExpired(address account) constant returns (bool) {
    if (lastActiveTime[account] == 0) return false;

    return lastActiveTime[account] + sscExpirationSeconds < block.timestamp;
  }

  function burn(address account, uint amount) onlyApplicationContracts unlessFrozen returns (bool) {
    // we expire all the user's SSC after inactivity that lasts longer than the expiration period
    if (hasExpired(account)) {
      uint expiredAmount = balanceOf[account];
      balanceOf[account] = 0;

      SSCExpired(msg.sender, msg.sender, account, account, expiredAmount);
      return false;
    } else {
      require(balanceOf[account] >= amount);

      balanceOf[account] -= amount;
      lastActiveTime[account] = block.timestamp;

      SSCBurned(msg.sender, msg.sender, account, account, amount);
      return true;
    }
  }

  function issueSSC(address recipient, uint amount) onlyAdmins unlessFrozen {
    require(balanceOf[recipient] + amount > balanceOf[recipient]);

    balanceOf[recipient] += amount;
    lastActiveTime[recipient] = block.timestamp;

    SSCIssued(msg.sender, msg.sender, recipient, recipient, amount);
  }

  function addAdmin(address admin) onlyOwner {
    admins[admin] = true;
  }

  function removeAdmin(address admin) onlyOwner {
    delete admins[admin];
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

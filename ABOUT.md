# About CardStack Tokens

## Smart Contracts

### CardStack Token Smart Contract
The CardStack Token smart contract governs the issuance, purchase, and selling of CardStack Tokens (CST) and is owned by the CardStack Foundation. This contract provides a capability to convert CST to SSC. Any CST captured as part of the CST -> SSC conversion is held in a reward pool. This contract also facilitates a special CST purchase that the SSC can perform as a means of holding custodial CST for CardStack users that wish to only deal in terms of SSC directly. At regular intervals, as part of the mining function, this contract consults an oracle to determine how to allocate the reward pool that has accrued. After the rewards are calculated, the CST balances of the reward recipients are updated accordingly. 

### Software and Services Credit Smart Contract
The Software and Services Credit smart contracts is governs the issuance, purchase, and selling of Software and Services Credits (SSC). Software and Services Credits are non transferable credits that are pegged to the USD and expire after a certain period. SSC can be used with a CardStack Application Smart Contract to redeem for software and services for a CardStack application that the CardStack Application contract governs.

### CardStack Application Smart Contract
The CardStack Application smart contract is used to collect Software and Services Credits from CardStack users as prepayment for software and services as outlined by the smart contract. The CardStack Application smart contract uses an oracle function to determine how much SSC to burn the SSC based on metered usage of the application and a services multipler. A CardStack Application smart contract is instantiated from a "genesis contract" where the CardStack application maintainer can stipulate the terms of the contract between them and the CardStack user via input paramters in the Genesis contract's function to create a CardStack Applicaiton smart contract. The SSC burns made by this contract are used by the CardStack Token smart contract (or maybe the attribution oracle itself?) to determine rewards.

### CardStack Application Genesis Smart Contract
The CardStack Application Genesis Smart Contract is used a means to produce instances of the CardStack Application Smart Contract. A CardStack application maintainer can invoke a function in the Genesis smart contract with various parameters that govern the contract between a CardStack application maintainer and a CardStack user to create a new instance of a CardStack Application smart contract. Various parameters specified as part of the creation of a CardStack Application smart contact would be the amount of SSC and the frequency of SSC redemptions required to maintain the CardStack application. 

### CardStack CST->SSC Exchange Smart Contract
The CardStack CST->SSC Exchange Smart Contract allows users to exchange the CST for SSC based on the current market rate of the CST, which is determined via an oracle function. The CST collected from the contract will be added to the CST reward pool maintained by the CST smart contract.

## Lifecycle

1. The CardStack Foundation creates the CardStack Token smart contract that governs CST, as part of this creation the following are established:
    * The total amount of CST
    * A cap on the amount of CST that can be purchased from the CST smart contract
    * The price for which the CST smart contract will sell available CST (in units of wei)
    * The price for which the CST smart contract will buy CST (in units of wei)
    
2. After the CST smart contract has been created, the CardStack Foundation can adjust any of the parameters that were initially specified during the creation of the CST smart contract including:
    * Changing the CST sell cap
    * Changing the price for which CST are bought or sold from the CST smart contract
    * Minting new CST tokens
    
3. The CardStack Foundation create the Software and Services Credit smart contract that governs SSC, as part of this creation the following are established:
    * A pool of ethers (collected from the CardStack Foundation wallet) that can be used to control inflationary pressures so that SSC is pegged to USD. Note: an automatic buying/selling function is used to regulate the the value of the SSC so that it is pegged to the USD
    
4. After the SSC smart contract has been created, the CardStack Foundation can add more ethers to the SSC smart contract which will control the amount of SSC tokens available to purchase.

--- End of initial setup ---

5. A CardStack application maintainer uses the CardStack Application Genesis smart contract to create an instance of an Card Stack Application smart contract for the CardStack application that they are maintaining. This Application smart contract is tied to a particular CardStack application for which it is associated.

6A. A CardStack user purchases CST from the CST smart contract. Additionally, the CardStack Foundation may, of its chosing, grant CST to individuals.
   * A CardStack user uses the CST->SSC exchange smart contract to exchange their CST to SSC based on the current market value of CST. CST collected from this contract will be added to the reward pool maintained by the CST smart contract

6B. A CardStack user uses ethers to purchase SSC from the SSC smart contract.
   * the SSC smart contract will, behind the scenes, perform a custodial purchase of CST with the ethers sent to the buy function of the SSC smart contract. 
   * The CST purchased in this manner will then be presented to the CST->SSC exchange smart contract, so that the CST can be captured as part of the reward pool, and the CardStack user will be given SSC
   * the custodial purchase of CST in this manner will be capped to a maximum amount.

7. 

8.

9.

  




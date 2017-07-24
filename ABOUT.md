# About CardStack Tokens

## Smart Contracts

### CardStack Token Smart Contract
The CardStack Token smart contract governs the issuance, purchase, and selling of CardStack Tokens (CST) and is owned by the CardStack Foundation. This contract has the ability to create mulitple instances of the CardSTack Attribution Smart Contract which governs specific CardStack applications.

### CardStack Attribution Smart Contract
The CardStack Attribution smart contract is used to collect Software and Services Credits and then disseminate the CST rewards based on attribution signals for a specific CardStack project. A CardStack Attribution smart contract is instantiated from the CardStack Token contract by the CardStack application maintainer. A reward pool, based on the CST value of the SSC collected is disbursed amongst the contributors of the CardStack application for which the CardStack Attribution contract was created. The reward pool disbursements are based on attribution signals collected by a CardStack attribution oracle.

### Software and Services Credit Smart Contract
The Software and Services Credit smart contracts is governs the issuance, purchase, and selling of Software and Services Credits (SSC). Software and Services Credits are non transferable credits that are pegged to the USD and expire after a certain period. SSC can be used with a CardStack Attribution Smart Contract to exchange for software and services for a CardStack application that the Attribution contract governs.


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

5. A CardStack application maintainer uses the CST smart contract to create an instance of an Attribution smart contract for the CardStack application that they are maintaining. This Attribution smart contract is tied to a particular CardStack application and will disseminate rewards for contributors of the CardStack application for which it is associated.

6. CardStack users purchase CST from the CST smart contract. Additionally, the CardStack Foundation may, of its chosing, grant CST to individuals.

7. A CardStack user uses CST to purchase SSC from the SSC smart contract. The amount of SSC that purchase with CST is based on an oracle function that determines the market value of CST in terms of USD. The CST collected by the SSC smart contract will be added to a reward pool that is drawn upon from CardStack Attribution smart contracts. All CST collected is eventually disseminated via attribution rewards.

8. A CardStack user uses ethers to purchase SSC from the SSC smart contract. The ethers collected by the SSC smart contract are used to purchase CST from the CST smart contract which will be added to a reward pool that is drawn upon from CardStack Attribution smart contracts. All CST purchased through this step is eventually disseminated via attribution rewards in the same manner as the previous step.

9.

  




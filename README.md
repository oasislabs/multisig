# Multisig

## Introduction
This is an example service that implements transactions that require multiple signatures. If you require mulitple parties to sign off on a transaction before executing it, you can use this service to enforce that policy.

For example,  

    S1 ---
          |
    S2 ---|----- Multisig Service ---- Service Requiring MultiSig
          |
    S3 ---

## Service
The service acts as a simple aggregator of confirmations from different addresses. It is immutable in terms of which addresses can provide confirmations and how many confirmations are required for a transaction to be considered "confirmed". Thus it must be initialized with a list of all the expected signers. If a signer needs to be added or removed, a new service must be deployed. 

The other service or RPC call that requires multiple signatures should be programmed to only accept transactions from the deployed multisig service. 

## Example
An example of how this service should be used would be the following:
1. A client aggregates the list of required signers and deploys a multisig service with the list, and a required number to confirm a transaction. This client broadcasts the address of the deployed service to the other signers.
2. A client deploys a service that requires multiple signatures to execute RPC calls, and programs it to only accept requests from the deployed multisig service.
3. One of the signers creates and uploads an unsigned transaction to the multisig service. 
4. The other signers can pull the transaction payload to inspect it. 
5. After inspecting the transaction, the signer can send a confirmation of that transaction. A confirmation can be revoked at any time.
6. After enough confirmations have been received, any one of the signers can send the transaction.
7. Once a transaction has been executed, it cannot be executed again.

import { SHA256 } from "crypto-js"
import uuid from 'uuid';

const currentNodeUrl = process.argv[3];
class Blockchain {
    chain: any[];
    pendingTransactions: any[];
    currentNodeUrl = currentNodeUrl;
    networkNodes: any[];

    constructor() {
        this.chain = [];
        this.pendingTransactions = [];
        this.createNewBlock(100, '0', '0');
        this.currentNodeUrl = currentNodeUrl;
        this.networkNodes = [];
    }

    createNewBlock = (nonce: number, previousBlockHash: string, hash: string) => {
        const newBlock = {
            index: this.chain.length + 1,
            timestamp: Date.now(),
            transactions: this.pendingTransactions,
            nonce: nonce,
            hash: hash,
            previousBlockHash: previousBlockHash
        }

        this.pendingTransactions = [];
        this.chain.push(newBlock);
        return newBlock;
    }

    getLastBlock = () => {
        return this.chain[this.chain.length - 1];
    }

    createNewTransaction = (amount: number, sender: string, recipient: string) => {
        const newTransaction = {
            transactionId: uuid().split('-').join(''),
            amount: amount,
            sender: sender,
            recipient: recipient
        }
        return newTransaction;
    }

    addTransactionToPendingTransactions = (transactionObj: any) => {
        this.pendingTransactions.push(transactionObj);
        return this.getLastBlock()['index'] + 1;
    }

    hashBlock = (previousBlockHash: string, currentBlockData: any, nonce: number) => {
        const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
        const hash = SHA256(dataAsString).toString();
        return hash;
    }

    proofOfWork = (previousBlockHash: string, currentBlockData: any) => {
        let nonce = 0;
        let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);

        while (hash.substring(0, 4) !== '0000') {
            nonce++;
            hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
        }
        return nonce;
    }

     chainIsValid = (blockchain : any) => {
        for (let i = 1; i < blockchain.length; i++) {
            const currentBlock = blockchain[i];
            const prevBlock = blockchain[i - 1];
            const blockHash = this.hashBlock(prevBlock['hash'], { transactions: currentBlock['transactions'], index: currentBlock['index'] }, currentBlock['nonce']);
            if (currentBlock['hash'] !== blockHash) 
            {
                return false;
            }
            if (blockHash.substring(0, 4) !== '0000') { 
                return false
            }
            if (currentBlock['previousBlockHash'] !== prevBlock['hash']) {
                return false;
            }
        }
        const genesisBlock = blockchain[0];
        const correctNonce = genesisBlock['nonce'] === 100;
        const correctPreviousBlockHash = genesisBlock['previousBlockHash'] === '0'
        const correctHash = genesisBlock['hash'] === '0';
        const correctTransactions = genesisBlock['transactions'].length === 0;
        if (!correctNonce || !correctPreviousBlockHash || !correctHash || !correctTransactions ) { 
            return false;
        }
        return true;
     }

     getBlock = (blockHash: string) => {
        for (const block of this.chain) {
            if (block.hash === blockHash) return block;
        }
        return null;
     } 

     getTransaction = (transactionId: string) => {
        for (const block of this.chain) {
            for (const transaction of block.transactions) {
                if (transaction.transactionId === transactionId) {
                    return {
                        block: block,
                        transaction: transaction
                    };
                }
            }
        }
        return null;
     } 

     getAddressData = (address: string) => {
         const addressTransactions = [];
         for (const block of this.chain) {
             for (const transaction of block.transactions) {
                if (transaction.sender === address || transaction.recipient === address) {
                    addressTransactions.push(transaction);
                }
             }
         }
         let balance = 0;
         for (const transaction of addressTransactions) {
            if (transaction.recipient == address) {
                balance += transaction.amount;
            }
            else if (transaction.sender == address) {
                balance -= transaction.amount;
            }
         }
         return {
             addressTransactions: addressTransactions,
             adressBalance: balance
         }
     }
}

export { Blockchain }
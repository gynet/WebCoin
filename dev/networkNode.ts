import express from 'express'
import bodyParser from 'body-parser'
import { Blockchain } from './blockchain'
import uuid from 'uuid'
import axios from 'axios'
import path from 'path'

const nodeAddress = uuid().split('-').join('');
const bitcoin = new Blockchain();

const port = process.argv[2];

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded( { extended : false}));

app.get('/blockchain', function(req, res) {
    res.json(bitcoin);
});

app.post('/transaction', function(req, res) {
    const newTransaction = req.body;
    const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction);
    res.json( { note: `Transaction will e added in block ${blockIndex}`});
});

app.post('/transaction/broadcast', async (req, res) => {
    const newTransaction = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
    bitcoin.addTransactionToPendingTransactions(newTransaction);
    const requestPromise: any[] = [];
    bitcoin.networkNodes.forEach(networkUrl => {
        requestPromise.push(axios.post(networkUrl + '/transaction', newTransaction));
    });
    await Promise.all(requestPromise);
    res.json( { note: 'Transaction created and broadcasted successfully'});
});

app.get('/mine', async (req, res) => {
    const lastBlock = bitcoin.getLastBlock();
    const preBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions: bitcoin.pendingTransactions,
        index: lastBlock['index'] + 1
    }
    const nonce = bitcoin.proofOfWork(preBlockHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(preBlockHash, currentBlockData, nonce);
    const newBlock = bitcoin.createNewBlock(nonce, preBlockHash, blockHash);

    let broadcastBlockPromises: Promise<any>[] = [];

    bitcoin.networkNodes.forEach(networkUrl => {
         broadcastBlockPromises.push(axios.post(networkUrl + '/receive-new-block',
            { newBlock: newBlock}));
    });

    await Promise.all(broadcastBlockPromises);
    await axios.post(bitcoin.currentNodeUrl + '/transaction/broadcast',
        {
            amount: 12.5,
            sender: '00',
            recipient: nodeAddress
        }
    );
    res.json({
        note: "New Block mined & broadcasted successfully",
        block: newBlock
    });
});

app.post('/receive-new-block', (req, res) => {
    const newBlock = req.body.newBlock;
    const lastBlock = bitcoin.getLastBlock();
    const correctHash = lastBlock.hash === newBlock.previousBlockHash;
    const correctIndex = lastBlock['index'] + 1 === newBlock['index'];
    if (correctHash && correctIndex) {
        bitcoin.chain.push(newBlock);
        bitcoin.pendingTransactions = [];
        res.json({
            note: 'New block received and accepted',
            newBlock: newBlock
        });
    } else {
        res.json({
            note: 'New block rejected.',
            newBlock: newBlock
        });
    }
});

app.post('/register-and-broadcast-node', async (req, res) => {
    const newNodeUrl = req.body.newNodeUrl.toString();
    if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1) {
        bitcoin.networkNodes.push(newNodeUrl);
    }

    let regNodesPromises: Promise<any>[] = [];
    bitcoin.networkNodes.forEach(networkUrl => {
        regNodesPromises.push(axios.post(networkUrl + '/register-node',
            { newNodeUrl: newNodeUrl }));
    });

    await Promise.all(regNodesPromises);
    await axios.post( newNodeUrl + '/register-nodes-bulk', { allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl]});
    res.json( { note : "New node registered with network successfully"} );  
});

app.post('/register-node', (req, res) => {
    const newNodeUrl = req.body.newNodeUrl.toString();
    const notCurrentNode = bitcoin.currentNodeUrl.trim() !== newNodeUrl.trim();
    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
    if (nodeNotAlreadyPresent && notCurrentNode) {
        bitcoin.networkNodes.push(newNodeUrl);
    }
    res.json({ note: 'New node registered successfully with Node' });
});

app.post('/register-nodes-bulk', (req, res) => {
    const allNetworkNodes: any [] = req.body.allNetworkNodes;

    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;
        const notCurrentNode = bitcoin.currentNodeUrl.trim() !== networkNodeUrl.trim();
        if (nodeNotAlreadyPresent && notCurrentNode)  {
            bitcoin.networkNodes.push(networkNodeUrl);
        }
    });

    res.json( { note: "bulk registred successfully. "});
});

app.get('/consensus', async (req, res) => {
    let requestPromises: any[] = [];
    bitcoin.networkNodes.forEach(async networkNodeUrl => {
         requestPromises.push(axios.get(networkNodeUrl + '/blockchain'));
    });
    const nbrBlockchains = (await Promise.all(requestPromises)).map( response => response.data);

    const currentChainLength = bitcoin.chain.length;
    let maxChainLength = currentChainLength;
    let newLongestChain = null;
    let newPendingTransactions = null;
    nbrBlockchains.forEach(
        blockchain => {
            if (blockchain.chain.length > maxChainLength) {
                maxChainLength = blockchain.chain.length;
                newLongestChain = blockchain.chain;
                newPendingTransactions = blockchain.pendingTransactions;
            }
        }
    );

    if (newLongestChain && bitcoin.chainIsValid(newLongestChain)) {
        bitcoin.chain = newLongestChain;
        bitcoin.pendingTransactions = newPendingTransactions == null? [] : newPendingTransactions;
        res.json({
            note: 'This chain has been replaced',
            chain: bitcoin.chain
        });
    } else {
        res.json({
            note: 'Current chain has not been replaced.',
            chain: bitcoin.chain
        });
    }
});

app.get('/block/:blockHash', (req, res) => {
    const blockHash = req.params.blockHash;
    const correctBlock = bitcoin.getBlock(blockHash);   
    res.json({ block: correctBlock});
});

app.get('/transaction/:transactionId', (req, res) => {
    const transactionId = req.params.transactionId;
    res.json(bitcoin.getTransaction(transactionId));
});

app.get('/address/:address', (req, res) => {
    const address = req.params.address;
    const addressData = bitcoin.getAddressData(address);
    res.json({
        addressData: addressData
    });
});

app.get('/block-explorer', (req, res) => {
    const htmlPath = path.join(__dirname, './block-explorer/index.html')
    res.sendFile(htmlPath);
});

app.listen(port, () => {
    console.log(`Listening on port ${ port }...`);
});
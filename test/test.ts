import { Blockchain } from '../dev/blockchain';
import { SHA256 } from 'crypto-js';

const chain = [
        {
            "index": 1,
            "timestamp": 1536451961958,
            "transactions": [],
            "nonce": 100,
            "hash": "0",
            "previousBlockHash": "0"
        },
        {
            "index": 2,
            "timestamp": 1536451985812,
            "transactions": [
                {
                    "transactionId": "075ea627f3474b7e90c794884d9b7d23",
                    "amount": 250,
                    "sender": "RRRNNDJJ222",
                    "recipient": "FJTJTJJTJT"
                }
            ],
            "nonce": 54742,
            "hash": "000044186b6736956027736c713aee239367d80bce02866d82ee370a2545a8c6",
            "previousBlockHash": "0"
        }
    ];

const bitcoin = new Blockchain();
console.log(bitcoin.chainIsValid(chain));
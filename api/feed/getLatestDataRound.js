const anchor = require("@project-serum/anchor");
const chainlink = require("@chainlink/solana-sdk");
const solanaWeb3 = require("@solana/web3.js");
const { Wallet } = require("../../models/wallet.model");
const { CURRENCY_PAIRS } = require("../../src/lib/constants");
const { connectToDatabase } = require("../../lib/mongoose");
const Feed = require("../../models/feed.model");

// creation of wallett using your private key
const secret = Uint8Array.from(process.env.WALLET_PRIVATE_KEY.split(','));
const wallet = new Wallet(solanaWeb3.Keypair.fromSecretKey(secret));

/**
 * This function retrieves the latest price feed data round from Chainlink Data Feeds.
 * 
 * 
 * It creates it connects to solana cluster (devnet | mainnet)
 * Then creates an anchor client provider that uses:
 * 1. A solana connection
 * 2. A wallet to sign transactions and pay for fees
 * 3. Options to confirm transactions
 * 
 * Then retrieves the latest price feed data round from Chainlink Data Feeds.
 * 
 * For more info view How to get Data Feeds On-Chain (Solana) via the link:
 * https://docs.chain.link/solana/overview
 * @param address Address of the token pair to retrieve the latest data round from
 * @param pair Pair of the token price feed to retrieve the latest data round from
 */
const getLatestDataRound = async (address, pair) => {

    let round = null;

    //  connection to solana cluster node
    const connection = new solanaWeb3.Connection(
        solanaWeb3.clusterApiUrl(process.env.REACT_APP_SOLANA_CLUSTER_NETWORK), 
        'confirmed'
    );

    // creation of a new anchor client provider that uses the connection to solana cluster node
    const options = anchor.AnchorProvider.defaultOptions(); // default Options for confirming transactions
    const provider = new anchor.AnchorProvider(connection, wallet, options);
    anchor.setProvider(provider);

    const CHAINLINK_FEED_ADDRESS = address; 
    console.log('Fetching pair:', pair);
    console.log('Fetching address:', address);

    const feedAddress = new anchor.web3.PublicKey(CHAINLINK_FEED_ADDRESS);

    // load the data feed account using the predefined chainlink program ID
    const CHAINLINK_PROGRAM_ID = new anchor.web3.PublicKey(process.env.CHAINLINK_PROGRAM_ID_ADDRESS);
    let dataFeed = await chainlink.OCR2Feed.load(CHAINLINK_PROGRAM_ID, provider);
    let listener = null;

    return new Promise(async (res, rej) => {
        // listen for events from the price feed, and grab the latest rounds' price data
        listener = dataFeed.onRound(feedAddress, (event) => {
            round = {
                pair: pair,
                feed: address,
                answer: event.answer,
                answerToNumber: event.answer.toNumber(),
                roundId: event.roundId,
                observationsTS: event.observationsTS,
                slot: event.slot,
            };
            // return the latest round only if event data is available
            if((round) !== undefined) {
                provider.connection.removeOnLogsListener(listener);
                res(round);
            }
        });
    });

}

/**
 * This function is deployed as a standalone endpoint via Vercel Cloud Functions. 
 * Given the expected request query payload, it retrieves the latest price feed data round from Chainlink Data Feeds.
 * The request is expected to come in as a GET request to `/api/feed/getLatestDataRound`. 
 * The request body should have the shape: 
 * { address: "0x...", pair: "XXX-USD" }
 * For more info view How to get Data Feeds On-Chain (Solana) via the link:
 * https://docs.chain.link/solana/overview
 * @param req NextApiRequest HTTP request object wrapped by Vercel function helpers
 * @param res NextApiResponse HTTP response object wrapped by Vercel function helpers
 */
module.exports = async (req, res) => {

    const { cached } = req.query;

    const updateRoundCache = async (round) => {
        await Feed.findOneAndUpdate({ feed: round.feed }, round, {upsert: true})
    }

    const getRoundsCache = async () => {
        const feed = await Feed.find();

        if(feed.length === 0 ){
            getLatestDataRounds(); 
            return;
        }

        res.status(200).send(feed);
    }

    const getLatestDataRounds = async () => {
        const promises = await CURRENCY_PAIRS.map(pair => {
            return new Promise((resolve, reject) => {
                return getLatestDataRound(pair.feedAddress, pair.pair)
                .then(async (res) => {
                    await updateRoundCache(res);
                    resolve(res);
                });
            });
        });

        Promise.allSettled(promises)
        .then(response => {
            res.status(200).send(response);
        })
        .catch(err => {
            res.status(500).send(err);
        });
    }

    try {
        await connectToDatabase();
        if(cached === 'true'){
            getRoundsCache();
        }else{
            getLatestDataRounds();
        }
        
    }

    catch(err) {
        res.status(500).send(err);
    }
} 
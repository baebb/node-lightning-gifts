// NPM Dependencies
const express = require('express');
const cryptoRandomString = require('crypto-random-string');

// Module Dependencies
const {
    showCurrencies,
    createInvoice,
    getInvoiceStatus,
    redeemGift,
    checkRedeemStatus
} = require('./controllers');
const {
    getCrateInfo,
    createCrate,
    emptyCrate,
    giftWithdrawTry,
    giftWithdrawFail
} = require('./models');

const app = express();

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/currency', (req, res) => {
    showCurrencies().then(response => {
        res.json(response.data);
    });
});

app.post('/create', (req, res, next) => {
    const { amount } = req.body;
    const orderId = cryptoRandomString({ length: 48 });

    createInvoice({ orderId, amount })
        .then(response => {
            const { id: chargeId, status, lightning_invoice, amount } = response.data.data;

            res.json({ orderId, chargeId, status, lightning_invoice, amount });
        })
        .catch(error => {
            console.log({ orderId, error });
            next(error);
        });
});

app.get('/status/:chargeId', (req, res, next) => {
    const { chargeId } = req.params;

    getInvoiceStatus(chargeId)
        .then(response => {
            const { id: chargeId, status, order_id: orderId, amount } = response.data.data;

            if (status === 'paid') {
                try {
                    createCrate({ orderId, chargeId, amount });
                } catch (error) {
                    next(error);
                }
            }

            res.json({ status });
        })
        .catch(error => {
            next(error);
        });
});

app.get('/gift/:orderId', (req, res, next) => {
    const { orderId } = req.params;

    try {
        getCrateInfo(orderId).then(response => {
            if (response) {
                res.json({ ...response, orderId });
            } else {
                res.status(404).send({
                    message: 'notFound'
                });
            }
        });
    } catch (error) {
        next(error);
    }
});

app.post('/redeem/:orderId', (req, res, next) => {
    const { invoice } = req.body;
    const { orderId } = req.params;

    getCrateInfo(orderId)
        .then(response => {
            const { amount, spent } = response;

            if (!spent || spent !== 'pending') {
                redeemGift({ amount, invoice })
                    .then(response => {
                        const { id: withdrawalId, reference } = response.data.data;

                        try {
                            giftWithdrawTry({
                                orderId,
                                withdrawalId,
                                reference
                            });
                        } catch (error) {
                            next(error);
                        }

                        res.json({ withdrawalId });
                    })
                    .catch(error => {
                        next(error);
                    });
            } else {
                next(new Error('GIFT_SPENT'));
            }
        })
        .catch(error => {
            next(error);
        });
});

app.post('/redeemStatus/:withdrawalId', (req, res, next) => {
    const { withdrawalId } = req.params;
    const { orderId } = req.body;

    checkRedeemStatus(withdrawalId)
        .then(response => {
            const { reference, status } = response.data.data;

            if (status === 'confirmed') {
                try {
                    emptyCrate(orderId);
                } catch (error) {
                    next(error);
                }
            }

            res.json({ reference, status });
        })
        .catch(error => {
            try {
                giftWithdrawFail(orderId);
            } catch (error) {
                next(error);
            }
            next(new Error('WITHDRAWAL_FAILED'));
        });
});

// error handling
app.use((error, req, res, next) => {
    if (!error.statusCode) error.statusCode = 500;
    console.log('error:', error);
    res.status(error.statusCode).send({
        statusCode: error.statusCode,
        message: error.message
    });
});

// listen for requests :)
app.set('port', process.env.PORT || 8080);
const server = app.listen(app.get('port'), () => {
    console.log(`Your app is listening on port ${server.address().port}`);
});

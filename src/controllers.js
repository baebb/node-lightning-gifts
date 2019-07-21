// NPM Dependencies
const axios = require('axios');

const openNodeApi = axios.create({
    baseURL: 'https://api.opennode.co/v1',
    headers: {
        Authorization: process.env.OPENNODE_KEY,
        'Content-Type': 'application/json'
    }
});

const openNodeApiV2 = axios.create({
    baseURL: 'https://api.opennode.co/v2',
    headers: {
        Authorization: process.env.OPENNODE_KEY,
        'Content-Type': 'application/json'
    }
});

exports.createInvoice = ({ orderId, amount }) => {
    try {
        const description = `Lightning gift for ${amount} sats`;

        return openNodeApi.post('/charges', {
            order_id: orderId,
            amount,
            description
        });
    } catch (error) {
        console.log(error);
        Promise.reject(error);
    }
};

exports.showCurrencies = () => {
    try {
        return openNodeApi.get('/currencies');
    } catch (error) {
        console.log(error);
    }
};

exports.getInvoiceStatus = chargeId => {
    try {
        return openNodeApi.get(`/charge/${chargeId}`);
    } catch (error) {
        Promise.reject(error);
    }
};

exports.redeemGift = ({ amount, invoice }) => {
    try {
        return openNodeApiV2.post('/withdrawals', {
            type: 'ln',
            amount,
            address: invoice
        });
    } catch (error) {
        throw error;
    }
};

exports.checkRedeemStatus = withdrawalId => {
    try {
        return openNodeApi.get(`/withdrawal/${withdrawalId}`);
    } catch (error) {
        throw error;
    }
};

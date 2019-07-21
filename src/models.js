// NPM Dependencies
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ID,
        clientEmail: process.env.FIREBASE_EMAIL,
        privateKey: JSON.parse(`"${process.env.FIREBASE_KEY}"`)
    })
});

const db = admin.firestore();

const giftDb = process.env.NODE_ENV === 'production' ? 'prod-gifts' : 'dev-gifts';

exports.getCrateInfo = orderId =>
    db
        .collection(giftDb)
        .doc(orderId)
        .get()
        .then(doc => {
            if (!doc.exists) {
                return null;
            } else {
                return doc.data();
            }
        })
        .catch(err => {
            console.log('Error getting gift', err);
            return null;
        });

exports.createCrate = ({ orderId, chargeId, amount }) =>
    db
        .collection(giftDb)
        .doc(orderId)
        .set({
            id: orderId,
            amount,
            chargeId,
            spent: false,
            createdAt: admin.firestore.Timestamp.now()
        });

exports.emptyCrate = orderId =>
    db
        .collection(giftDb)
        .doc(orderId)
        .update({ spent: true });

exports.giftWithdrawTry = ({ orderId, withdrawalId, reference, address }) =>
    db
        .collection(giftDb)
        .doc(orderId)
        .update({
            spent: 'pending',
            withdrawalInfo: {
                withdrawalId,
                reference,
                createdAt: admin.firestore.Timestamp.now()
            }
        });

exports.giftWithdrawFail = orderId =>
    db
        .collection(giftDb)
        .doc(orderId)
        .update({ spent: false });

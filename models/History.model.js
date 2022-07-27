const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Transaction = new Schema({

    toMobileTelephone: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    refNo: {
        type: String,
        unique: true,
        required: true
    },
    transactionNo: {
        type: Number,
        unique: false,
        required: false
    },
    transactionId: {
        type: String,
        unique: false,
        required: false
    },
    topUpStatus: {
        type: String,
        required: false,
    },
    remark: {
        type: String,
        required: false,
    },
    paymentStatus: {
        type: String,
        required: false,
        default: 'Pending'
    },
    paymentMethod: {
        type: String,
        required: false,
        default: 'N/S'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
    , updatedAt: {
        type: Date,
        default: Date.now
    }
});

const HistorySchema = new Schema({
    fromMobileTelephone: {
        type: String,
        required: true,
        unique: true
    },
    medaUUID: {
        type: String,
        unique: true,
    },
    topupTransaction: [Transaction]

});

module.exports = mongoose.model('History', HistorySchema);
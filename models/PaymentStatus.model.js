const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentSchema = new Schema({
    medaUUID: {
        type: String,
        unique: true,
        required: true
    },
    refNo: {
        type: String,
        unique: true,
        required: true
    },
    paymentStatus: {
        type: String,
    },

    fromMobileTelephone: {
         type: String,
        default: null
    },
    toMobileTelephone: {
         type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        required: false
    }
});


module.exports = mongoose.model('medaPayment', PaymentSchema);
const express = require('express');
const { db } = require('../models/History.model');
const router = express.Router();

const History = require('../models/History.model');



router.get('/', async (req, res) => {

  try {
    const historys = await History.find();
    return res.status(200).json(historys);
  } catch (err) {
    return res.status(404).json({ message: err });
  }


});

router.get('/:phoneNumber', async (req, res) => {
  try {
    const history = await History.find({ fromMobileTelephone: req.params.phoneNumber });
    return res.status(200).json(history);

  } catch (err) {
    return res.status(404).json({ message: err });
  }

});

router.get('/meda/:medaUUID', async (req, res) => {
  try {

    const history = await History.aggregate([
      { $unwind: '$topupTransaction' },
      { $sort: { 'topupTransaction.updatedAt': -1 } },
      { $match: { medaUUID: req.params.medaUUID } },
      { $group: { _id: '$_id', 'Trans': { $push: '$topupTransaction' } } },
      { $project: { 'topupTransaction': '$Trans' } }
    ]);

    return res.status(200).json(history);

  } catch (err) {
    return res.status(404).json({ message: err });
  }

});

router.post('/history', async (req, res) => {
  const result = {
    transactionNo: 453,
    transactionId: 'wertyu',
    status: 'complete',
    id: 23459364
  };
  const history = new History({
    fromMobileTelephone: req.body.fromMobileTelephone,
    medaUUID: req.body.medaUUID,
    topupTransaction: [{
      toMobileTelephone: req.body.toMobileTelephone,
      amount: req.body.amount,
      refNo: req.body.refNo,
      transactionNo: result.transactionNo,
      transactionId: result.id,
      topUpStatus: result.status
    }]
  });
  history.save()
    .then(data => {
      return res.status(200).json(data);
    })
    .catch(err => {
      return res.status(500).json({ message: err });
    })
});

module.exports = router;
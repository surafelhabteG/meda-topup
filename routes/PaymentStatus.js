const express = require('express');
const router = express.Router();
const medaPayment = require('../models/PaymentStatus.model');


router.get('/',async(req,res)=>{
   try{
    const payments = await medaPayment.find();
    return res.status(200).json(payments);
  }catch(err){
    return res.status(404).json({message:err});
  }
})
router.get('/:medaUUID',async(req,res)=>{

   try{
    const payments = await medaPayment.find({medaUUID:req.params.medaUUID});
    return res.status(200).json(payments);
  }catch(err){
    return res.status(404).json({message:err});
  }
})
router.post('/',(req,res)=>{
  let result = statusPost(req.body);
  return res.status(result.status).json(result.data);    
});

module.exports = router;

// module.exports  = statusPost;
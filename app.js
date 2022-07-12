const express = require('express');
const app = express();
const fetch = require("node-fetch");
const axios = require('axios');
const cors = require('cors');
let token; // STU for tokken 
const mongoose =require('mongoose');
// require("dotenv").config();
const dotenv = require('dotenv');

dotenv.config();
const History = require('./models/History.model');

app.use(cors());
app.use(express.json());

const medaPayment = require('./models/PaymentStatus.model');

//Import Routers 
const PaymentStatusRoute = require('./routes/PaymentStatus');
const HistoryRoute = require('./routes/History');

app.use('/paymentStatus',PaymentStatusRoute);
app.use('/history',HistoryRoute);

//connect to DB
mongoose.connect(process.env.DB_CONNECTION,()=>{
  console.log('connected to DB');
})

//middleware generate token 
const preRequestScript =async (req,res,next)=>{
    const server       = "https://auth.teleport.et"; 
    const realm        = "tp_merchant"; 
    const grantType    = "client_credentials"; 
    const credential   = process.env.credential;
    const url  = `${server}/auth/realms/${realm}/protocol/openid-connect/token`;
    const data = `grant_type=${grantType}`;

    axios({
      method: 'post',
      url: url,
      data: 
            data,
    headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credential}`,
        },

    })
    .then(function(response){
        var response_json = response;

        process.env.token=response_json.data.access_token;
        token=response_json.data.access_token;
      
        next();
    })
    .catch(err=>{
        return res.send(err);
    })
}

app.use(preRequestScript);

app.get('/paymentCallback',(req,res)=>{
  let body = req.body;

  if(body.status == 'PAYED'){
    let data = {
      medaUUID:body.metaData.metaData.medaUUID,
      refNo:body.referenceNumber ,
      paymentStatus:body.status,
      fromMobileTelephone:body.accountNumber,
      toMobileTelephone: body.metaData.metaData.toMobileTelephone,
      amount:body.amount,
      paymentMethod:body.paymentMethod
    }

    let result;

    // call to the status post
     result = PaymentStatusRoute.call('statusPost', data);
    // call to topup process
     result = airTimeTopup(data);

    res.status(result.status).json(result.data);

  }

});

/**
  **** buy airtime 
 */

app.post('/airtime-topup',(req,res)=>{
  let msisdn = req.body.toMobileTelephone;
  let topupType = "PREPAID";
  let amount = req.body.amount;
     
  const url = 'https://api.teleport.et/api/airtime-topup';

  if(!process.env.token)res.send('invalid token');
  fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.token}`,
      },
      body: JSON.stringify({
      "msisdn": `${msisdn}`,
      "topupType": `${topupType}`,
      "amount": amount
  })
    }) 
    .then(async (response)=>{
      const result = await response.json();
      
      if(result.message !== 'Insufficient Balance'){
        result.refNo = req.body.refNo;
        result.fromMobileTelephone = req.body.fromMobileTelephone;

        updateTopupStatus(result,res);

      } 
    })
    .catch(err=>{
      updateTopupStatus(result,res);

      return res.status(500).json(err);
    })
});

/**
 send mongo _id and refNo of failed topup to retry
 */

app.put('/retry/:id',async(req,res)=>{
  const url = `https://api.teleport.et/api/airtime-topup/transactions/${req.params.id}/retry`;
  
  const query = {
    fromMobileTelephone:req.body.fromMobileTelephone,"topupTransaction.refNo":req.body.refNo
  };

  if(!process.env.token)res.send('invalid token');

  fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.token}`,
      }
    }) 
    .then(async response=>{
      const result = await response.json();

      if(result.status){
        await History.updateOne(query,{ $set: { "topupTransaction.$.topUpStatus": result.status, }});
        return res.status(200).json({status:true, message:'success'});  

      } else {
        return res.status(200).json({status:false, message:result.message});
      }
    })
    .catch(err=>{
      return res.status(500).json(err);
    })
});

/**
  **check balance endpoint**
 */

app.get('/balance',async (req,res)=>{  
  fetch('https://api.teleport.et/api/airtime-wallet/balance', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.token}`,
      }
  })
    .then(async response=>{
  
      const result = await response.json();
      return res.send(result);
      }
      )
    .catch(err=>{
      return res.send(err);
    })
});

app.post('/sideeffect',async (req,res)=>{
  let statusPostResult = saveStatusPost(req.body);

  let history = await History.find({fromMobileTelephone:req.body.fromMobileTelephone});

  if(!history.length){
    history = await History.find({medaUUID:req.body.medaUUID});
  }
  
  if(history.length){
    history[0].topupTransaction.push({
        toMobileTelephone: req.body.toMobileTelephone,
        amount:req.body.amount ,
        refNo:req.body.refNo ,
    });
    history[0].save()
    .then(data=>{
      return res.status(200).json(data)
      
    })
    .catch(err=>{
      return res.status(500).json(err)
    })
  } else{
    const history = new History({
      fromMobileTelephone:req.body.fromMobileTelephone,
      medaUUID:req.body.medaUUID,
      topupTransaction:[{
        toMobileTelephone: req.body.toMobileTelephone,
        amount:req.body.amount ,
        refNo:req.body.refNo ,
      }]
    });
    history.save()
    .then(data=>{
      return res.status(200).json(data)
    })
    .catch(err=>{
      return res.status(500).json(err)
    })
  }


})


function saveStatusPost(req){
  const payment = new medaPayment({
    medaUUID:req.medaUUID,
    refNo:req.refNo ,
    paymentStatus:req.paymentStatus,
    fromMobileTelephone:req.fromMobileTelephone,
    toMobileTelephone: req.toMobileTelephone,
    amount:req.amount ,
  });

  payment.save()
  .then(data=>{
    return {status:200, data:data};
  })
  .catch(err=>{
    return {status:500, data:{message:err}};
  })
}

async function updateTopupStatus(req,res, isTopupSuccess = true){
  const url = `https://api.pay.meda.chat/api/bills/${req.refNo}`;

  fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.bill_token}`,
      },
    }) 
    .then(async (response)=>{
      const billResult = await response.json();

      const query = {
        fromMobileTelephone:req.fromMobileTelephone,"topupTransaction.refNo":req.refNo
      }
      const data = { $set: { 
        "topupTransaction.$.paymentMethod": billResult.paymentMethod, 
        "topupTransaction.$.paymentStatus": 'PAYED', 
        "topupTransaction.$.topUpStatus": isTopupSuccess ? req.status : null, 
        "topupTransaction.$.transactionNo": isTopupSuccess ? req.transactionNo : null, 
        "topupTransaction.$.transactionId": isTopupSuccess ? req.id : null,
        "topupTransaction.$.updatedAt": new Date(),
      }}

      await History.updateOne(query,data);

      await medaPayment.updateOne({refNo:req.refNo}, { $set: { "paymentStatus": "PAYED", } });

      return res.status(200).json('success');

    })
    .catch(err=>{
      return res.status(500).json(err);

    })
}

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log('Listing on port 3000'));
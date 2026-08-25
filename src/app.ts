import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import notFound from './app/middlewares/notFound';
// import multer from "multer";
import allRouter from './app/routes';
// import {webhookRouter} from './app/module/Payment/Payment.routes';



import { orderPaymentWebhookRouter } from './app/module/OrderPayment/OrderPayment.routes';

const app: Application = express();

//use webhook route before app.use(express.json())
app.use("/api/v1/order-payment/webhook", orderPaymentWebhookRouter);

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(cors());

app.use('/uploads', express.static('uploads'));

// application routers ----------------
app.use('/', allRouter);


app.get('/', (req, res) => {
  res.send("Sneaker hub server is running ---- Welcome to Sneaker Hub API.");
});


// app.use((err:any, req:any, res:any, next:any) => {
//   if (err instanceof multer.MulterError) {
//     console.log(err.code);
//     console.log(err.field);

//     return res.status(400).json({
//       message: err.message,
//       field: err.field,
//     });
//   }

//   next(err);
// });


// global error handler
app.use(globalErrorHandler);
// not found
app.use(notFound);

export default app;

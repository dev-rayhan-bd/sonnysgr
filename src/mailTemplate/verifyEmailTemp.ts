import { TEmailTemplate } from "../interface/email.interface";

const verifyEmailTemp = (data: any) => `
  <html>
    <head>
      <style>
        body {
          font-family: 'Verdana', 'Arial', sans-serif;        
          font-family: Arial, sans-serif;
          background-color: #f2f3f8;
          margin: 0;
          padding: 0;
        }
        .container {
          font-family: 'Verdana', 'Arial', sans-serif;        
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #022C22;
          font-size: 26px;
          margin-bottom: 20px;
          font-weight: bold;
          text-align: center;
        }
        p {
          color: #555555;
          line-height: 1.8;
          font-size: 16px;
          margin-bottom: 20px;
        }
        .logo {
          text-align: center;
        }
        .logo-img {
          max-width: 20%;

        }
        .code {
          text-align: center;
          background-color: #e8f0fe;
          padding: 14px 24px;
          font-size: 20px;
          font-weight: bold;
          color: #022C22;
          border-radius: 6px;
          letter-spacing: 2px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          font-size: 13px;
          color: #9e9e9e;
          text-align: center;
        }
        .footer p {
          margin: 5px 0;
        }
        a {
          color: #022C22;
          text-decoration: none;
        }
      </style>
    </head>
     
    <body>
      <div class="container">

        <h1>Welcome to Sneakershub!</h1>

        <p>Hello, ${data.name}</p>

        ${ data?.isResetPassword ? `<p> To verify your email and secure your account, please use the one-time password (OTP) below:</p>` : `<p> To reset your password, please use the one-time password (OTP) below:</p>`}

        <h3>Your Otp: ${data.code}</h3>

        <p>This code will expire in 10 minutes. If you didnt request this, please ignore this email.</p>
        
        <p>Best Regards,<br>Team Sneakershub</p>
      </div>
      <div class="footer">
        <a href="#"><img src="" class="logo-img"/></a>
        
       <p> <a href="#">sneakerhub.com</a> | <a href="#">info@sneakerhub.com</a>.</p>
        <p> Follow Us on 
          <a href="#">Facebook</a> |
          <a href="#">Instagram</a>
        </p>
      </div>
    </body>
  </html>
`;

export default verifyEmailTemp;

// /<-- <a href="https://profitablebusinessesforsale.com/"><img src="uploads/logo/pbfs-logo.png" alt="PBFS" class="logo-img"/></a> -->

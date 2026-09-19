import nodemailer from 'nodemailer';
import config from '../config';
import AppError from '../errors/AppError';
import httpStatus from 'http-status';

interface IMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
  from?: string;
}

const sendEmail = async (params: IMailOptions): Promise<boolean> => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });

    const fromEmail = params.fromEmail || process.env.NODE_APP_EMAIL || config.SMTP_USER || '';
    const fromName = params.fromName || process.env.SITE_NAME || 'Sneaker Hub';

    const from =
      params.from ||
      (fromName && fromEmail ? `"${fromName.replace(/"/g, '')}" <${fromEmail}>` : fromEmail);

    const plainText =
      params.text ||
      params.html
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const mailOptions = {
      from,
      replyTo: fromEmail,
      to: params.to,
      subject: params.subject,
      text: plainText,
      html: params.html,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error: any) {
    console.error('Error sending mail: ', error);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send email');
  }
};

export default sendEmail;

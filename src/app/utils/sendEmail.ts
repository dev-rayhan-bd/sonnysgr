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
    const user = config.SMTP_USER || config.smtp.smtp_mail;
    const pass = config.SMTP_PASS || config.smtp.smtp_password;

    const transporter = nodemailer.createTransport({
      service: config.smtp.smtp_service || 'gmail',
      auth: {
        user,
        pass,
      },
    });

    const fromEmail = params.fromEmail || config.smtp_from || config.SMTP_USER || '';
    const fromName = params.fromName || config.smtp.name || 'GoSNKR';

    let from = params.from;
    if (!from) {
      if (config.smtp_from) {
        from = config.smtp_from;
      } else if (fromName && fromEmail) {
        from = `"${fromName.replace(/"/g, '')}" <${fromEmail}>`;
      } else {
        from = fromEmail;
      }
    }

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

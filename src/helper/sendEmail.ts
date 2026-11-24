import nodemailer from 'nodemailer';
import config from '../config/index';

const currentDate = new Date();

const formattedDate = currentDate.toLocaleDateString("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const sendEmail = async (options: { email: string; subject: string; html: any }) => {
  const user = config.smtp.smtp_mail || config.SMTP_USER;
  const pass = config.smtp.smtp_password || config.SMTP_PASS;

  const transporter = nodemailer.createTransport({
    service: config.smtp.smtp_service || 'gmail',
    host: config.smtp.smtp_host || 'smtp.gmail.com',
    port: parseInt(config.smtp.smtp_port as string) || 587,
    auth: {
      user,
      pass,
    },
  });

  const { email, subject, html } = options;

  let fromHeader = config.smtp_from || config.smtp.smtp_from;
  if (!fromHeader) {
    fromHeader = `"${config.smtp.name || 'GoSNKR'}" <${user}>`;
  } else if (!fromHeader.includes('"') && fromHeader.includes('<') && !fromHeader.startsWith('"')) {
    // e.g. <email@gmail.com> -> "GoSNKR" <email@gmail.com>
    const cleanEmail = fromHeader.replace(/[<>]/g, '').trim();
    fromHeader = `"${config.smtp.name || 'GoSNKR'}" <${cleanEmail}>`;
  }

  const mailOptions = {
    from: fromHeader,
    to: email,
    date: formattedDate,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;

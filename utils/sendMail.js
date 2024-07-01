import nodemailer from "nodemailer";
import dotenv from "dotenv";
import ejs from "ejs";
import path from "path";

const __dirname = path.resolve("D:\\lms\\server");

const sendMail = async (data, template) => {
  // Load environment variables
  dotenv.config();

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const { name, email, subject, message, activationCode, filePath } = data;

//   const filePath = path.join(__dirname, "mails", "activation-email.ejs");

  const html = await ejs.renderFile(filePath, {name, activationCode:activationCode});

  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: email,
    subject: subject,
    html: html,
  };

  await transporter.sendMail(mailOptions);
};

export default sendMail;

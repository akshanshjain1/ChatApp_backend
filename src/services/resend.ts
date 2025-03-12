import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, 
    pass: process.env.GMAIL_PASS, 
  },
});

export const sendEmail = async ({to, subject, text}:any) => {
  try {
    const info = await transporter.sendMail({
      from: `Chatkaro ${process.env.GMAIL_USER}`, 
      to,
      subject,
      text,
    });

    
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

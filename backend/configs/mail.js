const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "emadpa82@gmail.com",
    pass: "gsjs rynn peqj zsot",
  },
});

async function sendMail() {
  const info = await transporter.sendMail({
    from: '"Emad Node App" <emadpa82@gmail.com>',
    to: "amarthyashekharkn@gmail.com",
    subject: "Hello from Node 🚀",
    text: "Hey! This is sent using Node.js",
  });

  console.log("Mail sent:", info.messageId);
}

sendMail();

const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});
import sendgridMail from "@sendgrid/mail";

sendgridMail.setApiKey(process.env.SENDGRID_API_KEY);

async function handle(req, res) {
  const { content, email } = req.body;
  if (!content) {
    return res.status(400).send("Content must not be empty");
  }

  let contentSummary = content.trim();
  if (contentSummary.length > 60) {
    contentSummary = contentSummary.slice(0, 40) + "…";
  }

  const senderText = email || "<anonymous>";

  console.info(`Sending from ${senderText}:\n${content}`);

  const body = `${content}\n\nSent by ${senderText}`;

  try {
    await sendgridMail.send({
      to: "matchu1993@gmail.com",
      from: "impress-2020-feedback@openneo.net",
      subject: `DTI feedback: ${contentSummary}`,
      replyTo: email || undefined,
      text: body,
    });
  } catch (e) {
    console.error(e);
    if (e.response && e.response.body && e.response.body.errors) {
      console.error(e.response.body.errors);
    }
    return res.status(500).send("Error sending message, see logs");
  }

  return res.status(200).send();
}

export default async (req, res) => {
  beeline.withTrace(
    { name: "api/sendFeedback", operation_name: "api/sendFeedback" },
    () => handle(req, res)
  );
};

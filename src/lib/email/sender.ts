import nodemailer from "nodemailer";

interface SendEmailParams {
    html?: string;
    subject: string;
    text: string;
    to: string;
}

const parseBoolean = (value: string | undefined) =>
    value === "true" || value === "1";

const resolveSmtpPort = (value: string | undefined) => {
    if (!value) {
        return 587;
    }

    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        throw new Error("SMTP_PORT must be a valid number.");
    }

    return parsed;
};

export const sendEmail = async ({
    to,
    subject,
    text,
    html,
}: SendEmailParams) => {
    const host = process.env.SMTP_HOST;
    const port = resolveSmtpPort(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM;
    const secure = parseBoolean(process.env.SMTP_SECURE);

    if (!(host && user && pass && from)) {
        throw new Error(
            "Missing SMTP configuration. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM."
        );
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass,
        },
    });

    await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
    });
};

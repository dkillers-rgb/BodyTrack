import nodemailer from 'nodemailer';

function requireSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || user;

  if (!host || !user || !pass || !from) {
    throw new Error(
      'Envio de e-mail não configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM.'
    );
  }

  return { host, port, user, pass, from };
}

export async function sendTemporaryPasswordEmail(params: {
  to: string;
  temporaryPassword: string;
  recipientName?: string;
}): Promise<void> {
  const smtp = requireSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const name = params.recipientName?.trim() || 'utilizador';
  const subject = 'BodyTrack — senha temporária';
  const text = [
    `Olá ${name},`,
    '',
    'Recebemos um pedido de recuperação de senha no aplicativo BodyTrack.',
    '',
    `Senha temporária: ${params.temporaryPassword}`,
    '',
    'Esta senha é válida por 1 hora.',
    'Entre no aplicativo com esta senha e troque imediatamente por uma senha nova.',
    '',
    'Se não solicitou esta recuperação, ignore este e-mail.',
    '',
    'BodyTrack',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <p>Olá <strong>${name}</strong>,</p>
      <p>Recebemos um pedido de recuperação de senha no aplicativo <strong>BodyTrack</strong>.</p>
      <p style="font-size: 18px;"><strong>Senha temporária:</strong> <code style="background:#f3f3f3;padding:4px 8px;border-radius:4px;">${params.temporaryPassword}</code></p>
      <p>Esta senha é válida por <strong>1 hora</strong>.</p>
      <p>Entre no aplicativo com esta senha e <strong>troque imediatamente</strong> por uma senha nova.</p>
      <p style="color:#666;font-size:13px;">Se não solicitou esta recuperação, ignore este e-mail.</p>
      <p>BodyTrack</p>
    </div>
  `;

  await transporter.sendMail({
    from: smtp.from,
    to: params.to,
    subject,
    text,
    html,
  });
}

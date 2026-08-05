import { Resend } from "resend";

type PropertyLeadNotificationInput = {
  leadId: string;
  ownerName: string;
  propertyName: string;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  photosConfirmed: number;
};

type NotificationResult = {
  sent: boolean;
  emailId?: string;
};

function escapeHtml(
  value: string
): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeText(
  value: string,
  maximumLength: number
): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maximumLength);
}

function formatLocation({
  neighborhood,
  city,
  state,
}: Pick<
  PropertyLeadNotificationInput,
  "neighborhood" | "city" | "state"
>): string {
  const locationParts = [
    neighborhood,
    city,
    state,
  ]
    .map((value) =>
      value?.trim()
    )
    .filter(
      (value): value is string =>
        Boolean(value)
    );

  return locationParts.length > 0
    ? locationParts.join(" — ")
    : "Não informada";
}

export async function sendPropertyLeadNotification(
  input: PropertyLeadNotificationInput
): Promise<NotificationResult> {
  const resendApiKey =
    process.env.RESEND_API_KEY?.trim();

  const notificationEmail =
    process.env
      .PROPERTY_LEAD_NOTIFICATION_EMAIL
      ?.trim();

  /*
   * A ausência dessas variáveis não deve
   * impedir o cadastro da proposta.
   */
  if (
    !resendApiKey ||
    !notificationEmail
  ) {
    console.warn(
      "Notificação de proposta não enviada: variáveis do Resend não configuradas."
    );

    return {
      sent: false,
    };
  }

  const recipients =
    notificationEmail
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

  if (recipients.length === 0) {
    console.warn(
      "Notificação de proposta não enviada: e-mail de destino inválido."
    );

    return {
      sent: false,
    };
  }

  const ownerName =
    normalizeText(
      input.ownerName ||
        "Proprietário não informado",
      150
    );

  const propertyName =
    normalizeText(
      input.propertyName ||
        "Imóvel sem nome",
      180
    );

  const location =
    formatLocation(input);

  const photosConfirmed =
    Number.isFinite(
      input.photosConfirmed
    )
      ? Math.max(
          0,
          Math.trunc(
            input.photosConfirmed
          )
        )
      : 0;

  const adminUrl =
    `https://alugacasabuzios.com.br/admin/propostas/${encodeURIComponent(
      input.leadId
    )}`;

  const safeOwnerName =
    escapeHtml(ownerName);

  const safePropertyName =
    escapeHtml(propertyName);

  const safeLocation =
    escapeHtml(location);

  const textContent = [
    "Nova proposta de imóvel recebida",
    "",
    `Proprietário: ${ownerName}`,
    `Imóvel: ${propertyName}`,
    `Localização: ${location}`,
    `Fotos recebidas: ${photosConfirmed}`,
    "",
    "Acesse a proposta no painel administrativo:",
    adminUrl,
  ].join("\n");

  try {
    const resend =
      new Resend(resendApiKey);

    const {
      data,
      error,
    } = await resend.emails.send({
      from: "Aluga Casa Búzios <propostas@notificacoes.alugacasabuzios.com.br>",

      to: recipients,

      subject:
        `Nova proposta de imóvel: ${propertyName}`,

      text: textContent,

      html: `
        <!doctype html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />
            <title>Nova proposta de imóvel</title>
          </head>

          <body
            style="
              margin: 0;
              padding: 0;
              background-color: #f4f4f5;
              font-family: Arial, Helvetica, sans-serif;
              color: #18181b;
            "
          >
            <table
              role="presentation"
              width="100%"
              cellspacing="0"
              cellpadding="0"
              border="0"
              style="
                width: 100%;
                background-color: #f4f4f5;
              "
            >
              <tr>
                <td
                  align="center"
                  style="padding: 32px 16px;"
                >
                  <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                      width: 100%;
                      max-width: 620px;
                      overflow: hidden;
                      background-color: #ffffff;
                      border-radius: 24px;
                      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
                    "
                  >
                    <tr>
                      <td
                        style="
                          padding: 32px;
                          background-color: #172554;
                          color: #ffffff;
                        "
                      >
                        <p
                          style="
                            margin: 0;
                            color: #bae6fd;
                            font-size: 13px;
                            font-weight: bold;
                            letter-spacing: 2px;
                            text-transform: uppercase;
                          "
                        >
                          Aluga Casa Búzios
                        </p>

                        <h1
                          style="
                            margin: 12px 0 0;
                            font-size: 28px;
                            line-height: 1.25;
                          "
                        >
                          Nova proposta de imóvel
                        </h1>

                        <p
                          style="
                            margin: 12px 0 0;
                            color: #dbeafe;
                            font-size: 16px;
                            line-height: 1.6;
                          "
                        >
                          Um proprietário preencheu o formulário
                          “Anuncie conosco”.
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 32px;">
                        <table
                          role="presentation"
                          width="100%"
                          cellspacing="0"
                          cellpadding="0"
                          border="0"
                          style="
                            width: 100%;
                            border-collapse: collapse;
                          "
                        >
                          <tr>
                            <td
                              style="
                                padding: 14px 0;
                                border-bottom: 1px solid #e4e4e7;
                                color: #71717a;
                              "
                            >
                              Proprietário
                            </td>

                            <td
                              align="right"
                              style="
                                padding: 14px 0;
                                border-bottom: 1px solid #e4e4e7;
                                color: #172554;
                                font-weight: bold;
                              "
                            >
                              ${safeOwnerName}
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding: 14px 0;
                                border-bottom: 1px solid #e4e4e7;
                                color: #71717a;
                              "
                            >
                              Imóvel
                            </td>

                            <td
                              align="right"
                              style="
                                padding: 14px 0;
                                border-bottom: 1px solid #e4e4e7;
                                color: #172554;
                                font-weight: bold;
                              "
                            >
                              ${safePropertyName}
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding: 14px 0;
                                border-bottom: 1px solid #e4e4e7;
                                color: #71717a;
                              "
                            >
                              Localização
                            </td>

                            <td
                              align="right"
                              style="
                                padding: 14px 0;
                                border-bottom: 1px solid #e4e4e7;
                                color: #172554;
                                font-weight: bold;
                              "
                            >
                              ${safeLocation}
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding: 14px 0;
                                color: #71717a;
                              "
                            >
                              Fotos recebidas
                            </td>

                            <td
                              align="right"
                              style="
                                padding: 14px 0;
                                color: #172554;
                                font-weight: bold;
                              "
                            >
                              ${photosConfirmed}
                            </td>
                          </tr>
                        </table>

                        <div
                          style="
                            margin-top: 28px;
                            text-align: center;
                          "
                        >
                          <a
                            href="${adminUrl}"
                            style="
                              display: inline-block;
                              padding: 15px 26px;
                              border-radius: 999px;
                              background-color: #0284c7;
                              color: #ffffff;
                              font-size: 16px;
                              font-weight: bold;
                              text-decoration: none;
                            "
                          >
                            Abrir proposta no painel
                          </a>
                        </div>

                        <p
                          style="
                            margin: 28px 0 0;
                            color: #71717a;
                            font-size: 13px;
                            line-height: 1.6;
                            text-align: center;
                          "
                        >
                          Este é um aviso automático enviado pelo
                          site Aluga Casa Búzios.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error(
        "Erro do Resend ao enviar notificação:",
        error
      );

      return {
        sent: false,
      };
    }

    console.info(
      "Notificação de nova proposta enviada:",
      data?.id
    );

    return {
      sent: true,
      emailId: data?.id,
    };
  } catch (error) {
    console.error(
      "Erro inesperado ao enviar notificação da proposta:",
      error
    );

    return {
      sent: false,
    };
  }
}
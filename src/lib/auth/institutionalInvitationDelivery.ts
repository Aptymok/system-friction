import type { SupabaseClient } from '@supabase/supabase-js';

export type InstitutionalAccessClass = 'INSTITUTIONAL_OBSERVER' | 'INSTITUTIONAL_OPERATOR';

type DeliveryInput = {
  service: SupabaseClient;
  email: string;
  displayName: string;
  title: string;
  accessClass: InstitutionalAccessClass;
  redirectTo: string;
};

export type InstitutionalInvitationDelivery =
  | { ok: true; userId: string; channel: 'SFI_BRANDED_EMAIL' | 'AUTH_PROVIDER_DEFAULT' }
  | { ok: false; error: string; channel: 'SFI_BRANDED_EMAIL' | 'AUTH_PROVIDER_DEFAULT' };

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function accessLabel(accessClass: InstitutionalAccessClass) {
  return accessClass === 'INSTITUTIONAL_OBSERVER' ? 'OBSERVADOR INSTITUCIONAL' : 'OPERADOR INSTITUCIONAL';
}

export function institutionalInvitationEmail(input: {
  displayName: string;
  title: string;
  accessClass: InstitutionalAccessClass;
  actionLink: string;
}) {
  const name = escapeHtml(input.displayName);
  const title = escapeHtml(input.title);
  const label = accessLabel(input.accessClass);
  const link = escapeHtml(input.actionLink);

  const subject = 'System Friction Institute · Invitación de acceso';
  const text = [
    'SYSTEM FRICTION INSTITUTE',
    'INSTITUTIONAL ACCESS / INVITATION',
    '',
    `Hola ${input.displayName},`,
    '',
    'Has recibido una invitación de acceso a System Friction Institute.',
    `Referencia: ${input.title}`,
    `Clase de acceso: ${label}`,
    '',
    'Confirma tu identidad y define tu propia contraseña:',
    input.actionLink,
    '',
    'ACCESS ≠ AUTHORITY',
    'Esta invitación no concede ROOT, autoridad soberana, nombramiento institucional ni promoción canónica.',
    'SFI no genera, conoce ni comparte la contraseña que elijas.',
    '',
    'systemfriction.org',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#050504;color:#f0eadf;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050504;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border:1px solid rgba(214,170,87,.38);background:#090907">
<tr><td style="padding:26px 30px;border-bottom:1px solid rgba(214,170,87,.26)">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
<td style="font-family:Georgia,serif;font-size:25px;letter-spacing:.14em;color:#d6aa57">SFI.</td>
<td align="right" style="font-family:monospace;font-size:10px;letter-spacing:.16em;color:#8f8679">ACCESS / IDENTITY</td>
</tr></table></td></tr>
<tr><td style="padding:38px 30px 18px">
<div style="font-family:monospace;font-size:10px;letter-spacing:.22em;color:#d6aa57">INSTITUTIONAL INVITATION</div>
<h1 style="margin:12px 0 16px;font-family:Georgia,serif;font-weight:400;font-size:42px;line-height:1;color:#f3eee5">Confirmar acceso</h1>
<p style="margin:0;color:#bfb5a7;font-size:15px;line-height:1.7">Hola ${name}. Has recibido un grant de acceso a System Friction Institute. La identidad y la autoridad permanecen separadas.</p>
</td></tr>
<tr><td style="padding:12px 30px 6px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(214,170,87,.24)"><tr>
<td style="padding:12px;border-right:1px solid rgba(214,170,87,.2);font-family:monospace;font-size:10px;color:#d6aa57">01 · INVITATION<br><span style="color:#a79d8c">Emitida</span></td>
<td style="padding:12px;border-right:1px solid rgba(214,170,87,.2);font-family:monospace;font-size:10px;color:#d6aa57">02 · IDENTITY<br><span style="color:#a79d8c">Por verificar</span></td>
<td style="padding:12px;font-family:monospace;font-size:10px;color:#a79d8c">03 · ACCESS<br><span style="color:#766f64">Pendiente</span></td>
</tr></table></td></tr>
<tr><td style="padding:24px 30px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="padding:8px 0;border-bottom:1px solid rgba(214,170,87,.12);font-family:monospace;font-size:10px;color:#8f8679">REFERENCIA</td><td align="right" style="padding:8px 0;border-bottom:1px solid rgba(214,170,87,.12);font-size:13px;color:#d8c7aa">${title}</td></tr>
<tr><td style="padding:8px 0;font-family:monospace;font-size:10px;color:#8f8679">ACCESS CLASS</td><td align="right" style="padding:8px 0;font-family:monospace;font-size:10px;color:#d6aa57">${label}</td></tr>
</table></td></tr>
<tr><td style="padding:2px 30px 34px">
<a href="${link}" style="display:inline-block;padding:13px 18px;border:1px solid #d6aa57;background:#171109;color:#ead0a0;text-decoration:none;font-family:monospace;font-size:11px;letter-spacing:.12em">CONFIRMAR Y ACTIVAR</a>
<p style="margin:14px 0 0;color:#7f776c;font-size:11px;line-height:1.55">SFI no genera, conoce ni comparte la contraseña que elijas.</p>
</td></tr>
<tr><td style="padding:26px 30px;border-top:1px solid rgba(214,170,87,.26);background:#070706">
<div style="font-family:monospace;font-size:10px;letter-spacing:.18em;color:#d6aa57">AUTHORITY BOUNDARY</div>
<div style="margin:9px 0 10px;font-family:Georgia,serif;font-size:28px;color:#d8b572">ACCESS ≠ AUTHORITY</div>
<p style="margin:0;color:#999083;font-size:12px;line-height:1.6">Esta invitación no concede ROOT, autoridad soberana, nombramiento institucional ni promoción canónica.</p>
</td></tr>
<tr><td style="padding:18px 30px;font-family:monospace;font-size:9px;letter-spacing:.12em;color:#625c53">OBSERVATION · EVIDENCE · INFERENCE · AUTHORITY · EXECUTION · RETURN<br>systemfriction.org</td></tr>
</table></td></tr></table>
</body></html>`;

  return { subject, text, html };
}

function brandedEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

async function sendBrandedEmail(input: {
  to: string;
  displayName: string;
  title: string;
  accessClass: InstitutionalAccessClass;
  actionLink: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return { ok: false as const, error: 'SFI_BRANDED_EMAIL_NOT_CONFIGURED' };

  const email = institutionalInvitationEmail(input);
  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
      cache: 'no-store',
    });
  } catch (error) {
    return {
      ok: false as const,
      error: `SFI_BRANDED_EMAIL_TRANSPORT_FAILED:${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!response.ok) {
    const body = (await response.text().catch(() => '')).slice(0, 500);
    return { ok: false as const, error: `SFI_BRANDED_EMAIL_REJECTED:${response.status}:${body}` };
  }
  return { ok: true as const };
}

export async function deliverInstitutionalInvitation(input: DeliveryInput): Promise<InstitutionalInvitationDelivery> {
  const metadata = {
    display_name: input.displayName,
    sfi_access_class: input.accessClass,
    sfi_invitation: true,
  };

  if (brandedEmailConfigured()) {
    const generated = await input.service.auth.admin.generateLink({
      type: 'invite',
      email: input.email,
      options: { redirectTo: input.redirectTo, data: metadata },
    });

    const actionLink = generated.data?.properties?.action_link;
    const userId = generated.data?.user?.id;
    if (generated.error || !actionLink || !userId) {
      return {
        ok: false,
        channel: 'SFI_BRANDED_EMAIL',
        error: generated.error?.message ?? 'SFI_INVITE_LINK_NOT_GENERATED',
      };
    }

    const delivered = await sendBrandedEmail({
      to: input.email,
      displayName: input.displayName,
      title: input.title,
      accessClass: input.accessClass,
      actionLink,
    });
    if (!delivered.ok) return { ok: false, channel: 'SFI_BRANDED_EMAIL', error: delivered.error };
    return { ok: true, channel: 'SFI_BRANDED_EMAIL', userId };
  }

  const invitation = await input.service.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: input.redirectTo,
    data: metadata,
  });
  if (invitation.error || !invitation.data.user) {
    return {
      ok: false,
      channel: 'AUTH_PROVIDER_DEFAULT',
      error: invitation.error?.message ?? 'invite_user_missing',
    };
  }
  return { ok: true, channel: 'AUTH_PROVIDER_DEFAULT', userId: invitation.data.user.id };
}

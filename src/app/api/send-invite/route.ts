import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

const getAppUrl = () => {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  )
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "API funcionando" })
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Falta el email" }, { status: 400 })
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json(
        { error: "Faltan variables EMAIL_USER o EMAIL_PASS" },
        { status: 500 }
      )
    }

    const appUrl = getAppUrl()

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    await transporter.sendMail({
      from: `"TeDebo 💸" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Invitación a TeDebo",
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:32px;color:#111827">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 10px 30px rgba(0,0,0,0.06)">
            <div style="font-size:28px;font-weight:800;margin-bottom:8px">TeDebo 💸</div>
            <p style="font-size:15px;color:#6b7280;margin:0 0 20px">Te han invitado a la app para gestionar gastos y deudas entre amigos.</p>
            <h2 style="font-size:24px;margin:0 0 16px;color:#111827">Tienes una invitación pendiente</h2>
            <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 22px">
              Entra en la app con este correo y podrás aceptar la invitación, ver tus grupos y empezar a compartir gastos.
            </p>
            <a href="${appUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:12px;font-weight:700">
              Abrir TeDebo
            </a>
            <p style="margin-top:24px;font-size:13px;color:#6b7280">
              Si el botón no funciona, copia y pega este enlace:<br />
              <span style="word-break:break-all">${appUrl}</span>
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Error enviando email" }, { status: 500 })
  }
}


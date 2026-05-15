import { NextApiRequest, NextApiResponse } from 'next'
import { v4 as uuidv4 } from 'uuid'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body
    const magicToken = uuidv4()
    const expires = new Date(Date.now() + 1000 * 60 * 15) // 15 minutos

    // Aquí se debe insertar la lógica de persistencia en tu DB
    // db.magicLinks.create({ data: { email, token: magicToken, expires } })

    const magicUrl = `https://systemfriction.org/api/link/verify?token=${magicToken}`

    return res.status(200).json({ 
      success: true, 
      token: magicToken,
      url: magicUrl,
      message: 'Token de acceso generado correctamente' 
    })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}
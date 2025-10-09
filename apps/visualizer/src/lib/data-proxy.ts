// Data proxy to backend API
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8080/api'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const path = url.pathname.replace('/api', '/visualizer')
    const backendUrl = `${BACKEND_API_URL}${path}${url.search}`

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return Response.json(
        { error: 'Backend API error' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error('Data proxy error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import axios from 'axios'

const baseURL = 'http://localhost:3001'

export function request(url: string, method: 'GET' | 'POST', data?: object) {
  if (method === 'POST') {
    return axios({
      url: baseURL + url,
      method,
      data,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return axios({
    url: baseURL + url,
    method,
    params: data,
  })
}

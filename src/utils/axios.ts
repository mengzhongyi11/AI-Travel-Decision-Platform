import axios from 'axios'
const baseURL = 'http://localhost:3001'

export function request(url: string, method: 'GET' | 'POST', data?: object) {
  return axios({
    url: baseURL + url,
    method,
    // GET 用 params，POST 用 data
    [method === 'GET' ? 'params' : 'data']: {
      key: 'e9974e430e044349929f349398662f92',
      ...data,
    },
  })
}

import * as dotenv from 'dotenv'
import * as path from 'path'

const envPath = path.resolve(__dirname, '../../.env')
console.log('Loading .env from:', envPath)
dotenv.config({ path: envPath }) 
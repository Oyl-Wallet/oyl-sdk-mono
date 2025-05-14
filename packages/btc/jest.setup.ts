import * as dotenv from 'dotenv'
import * as path from 'path'

const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath }) 
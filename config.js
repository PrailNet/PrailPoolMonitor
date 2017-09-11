require('dotenv').config()
const env = process.env;

module.exports = {
    port: env.PORT || 3000,
    dbURI: env.MONGODB_URI,
    apiKey: env.API_KEY
}
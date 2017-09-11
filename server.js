const exphbs = require('express-handlebars')
const randomstring = require('randomstring')
const pkg = require('./package.json')
const mongoose = require('mongoose')
const express = require('express')
const config = require('./config')
const helmet = require('helmet')
const app = express()

if (!config.apiKey) {
    console.log('The API key is not set. Generating one for you!')
    let key = randomstring.generate()
    console.log('\nPlease add the following key as API_KEY in your environment or in the .env file:')
    console.log(key + '\n')
}

/**
 * Database Config
 */
mongoose.connect(config.dbURI, {
    useMongoClient: true
});

const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('Connected Successfully to DB!')
});

const PoolTemp = mongoose.model('PoolTemp', {
    _id: {
        type: String,
        unique: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    temp: String,
    wifi: String
});

/**
 * Express Config
 */
app.use(helmet())
app.engine('.hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs'
}));
app.set('view engine', '.hbs');

app.get('/', (req, res) => {
    PoolTemp
        .find({})
        .limit(24)
        .exec(function (err, feed) {
            if (err) {
                console.log(err)
            }
            return res.render('home', {
                feed: feed
            })
        })
})

app.get('/api', (req, res) => {
    return res.json({
        name: 'Prail.Net Pool Server',
        version: pkg.version,
        status: 'ok'
    })
})

app.get('/api/update', (req, res) => {
    let entry_id
    let entryData = req.query
    entryData.created_at = Date.now()

    if (req.query.api_key === config.apiKey) {
        PoolTemp
            .findOne({}, {}, {
                sort: {
                    'created_at': -1
                }
            })
            .exec(function (err, lastEntry) {
                if (err) {
                    console.log(err);
                    return res.status(500).send(err)
                }
                if (!lastEntry) {
                    entry_id = 1
                } else {
                    entry_id = lastEntry._id
                    entry_id++
                }

                entryData._id = entry_id
                var entry = new PoolTemp(entryData);
                entry.save(function (err) {
                    if (err) {
                        console.log(err);
                        return res.status(500).send(err)
                    } else {
                        console.log('Saved!');
                        return res.status(200).json(entryData)
                    }
                });
            })
    } else {
        return res.status(401).json({
            status: '401',
            error: {
                error_code: 'error_auth_required',
                message: 'Authorization Required',
                details: 'Please make sure that your API key is correct.'
            }
        })
    }
})

app.get('/api/feed', (req, res) => {
    let perPage = Math.max(0, req.query.per_page) || 24
    let page = Math.max(0, req.query.page)
    let sort = req.query.sort || 'desc'
    let orderBy = req.query.order_by || '_id'
    let sortObj = {}
    sortObj[orderBy] = sort
    PoolTemp
        .find({})
        .limit(perPage)
        .skip(perPage * page)
        .sort(sortObj)
        .exec(function (err, feed) {
            if (err) {
                console.log(err)
            }
            if (!feed) {
                return res.sendStatus(404)
            }

            return res.status(200).json(feed)
        })
})

app.listen(config.port, function () {
    console.log(`Prail.Net Pool Server listening on port ${config.port}!`)
})
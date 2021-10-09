/* Hey! 👋 
Thanks for checking out the code for our Discord Webhook Forwarder
This is a pretty simple project

Feel free to open a pull-request with any improvements

If you'd like to support us, please donate at https://www.buymeacoffee.com/hyrawork

A hosted version of this project is available at https://hook.hyra.io

All the best!
*/

const Axios = require("axios").default;

const axios = Axios.create({
    headers: {
        post: {
            Via: "HyraWebhookProxy/1.0"
        },
        get: {
            Via: "HyraWebhookProxy/1.0"
        },
        patch: {
            Via: "HyraWebhookProxy/1.0"
        },
        delete: {
            Via: "HyraWebhookProxy/1.0"
        }
    }
})

const express = require("express");
const rateLimit = require("express-rate-limit");
const MongoStore = require('rate-limit-mongo');

require("dotenv").config();

const app = express();

const windowMs = 1 * 60 * 1000;
const maxPerWindow = 30;

console.log(process.env);

const limiter = new rateLimit({
    store: new MongoStore({
        uri: process.env.MONGO_STRING,
        user: process.env.MONGO_USER,
        password: process.env.MONGO_PASSWORD,
        collectionName: process.env.MONGO_COLLECTION,
        authSource: process.env.MONGO_AUTH_SOURCE,
        expireTimeMs: windowMs,
        errorHandler: console.error.bind(null, 'rate-limit-mongo')
    }),
    windowMs: windowMs,
    max: maxPerWindow,
    keyGenerator: function (req) {
        return req.params.id
    },
    handler: function (req, res) {
        res.status(429).send({
            message: "You are being rate limited",
            retry_after: req.rateLimit.resetTime.getTime() - new Date().getTime()
        })
    }
})

app.use(express.json());

app.get("/", (req, res) => {
    res.send("There's no documentation for this service, just replace https://discord.com with https://hooks.hyra.io to proxy your requests");
})

// Fetch information about a webhook
app.get("/api/webhooks/:id/:token", limiter, (req, res) => {
    axios.get(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}`).then(result => {
        res.send(result.data);
    }).catch(err => {
        res.status(err.response.status).send(err.response.data);
    })
})

// Post to a webhook
app.post("/api/webhooks/:id/:token", limiter, (req, res) => {
    console.log(req.body);
    axios.post(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}`, req.body).then(result => {
        res.send(result.data);
    }).catch(err => {
        res.status(err.response.status).send(err.response.data);
    })
})

// Edit a webhook message
app.patch("/api/webhooks/:id/:token/messages/:messageId", limiter, (req, res) => {
    axios.patch(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}/messages/${req.params.messageId}`, req.body).then(result => {
        res.send(result.data);
    }).catch(err => {
        res.status(err.response.status).send(err.response.data);
    })
})

// Delete a webhook message
app.delete("/api/webhooks/:id/:token/messages/:messageId", limiter, (req, res) => {
    axios.delete(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}/messages/${req.params.messageId}`).then(result => {
        res.send(result.data);
    }).catch(err => {
        res.status(err.response.status).send(err.response.data);
    })
})

// Slack Compatible
app.post("/api/webhooks/:id/:token/slack", limiter, (req, res) => {
    axios.post(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}/slack`, req.body).then(result => {
        res.send(result.data);
    }).catch(err => {
        res.status(err.response.status).send(err.response.data);
    })
})

// GitHub Compatible
app.post("/api/webhooks/:id/:token/github", limiter, (req, res) => {
    axios.post(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}/github`, req.body).then(result => {
        res.send(result.data);
    }).catch(err => {
        res.status(err.response.status).send(err.response.data);
    })
})

app.listen(7053, () => {
    console.log("🙌 Listening for Requests")
});
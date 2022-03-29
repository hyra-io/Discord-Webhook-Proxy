/* Hey! 👋 
Thanks for checking out the code for our Discord Webhook Forwarder
This is a pretty simple project

Feel free to open a pull-request with any improvements
If you'd like to support us, please donate at https://www.buymeacoffee.com/hyrawork
A hosted version of this project is available at https://hooks.hyra.io

All the best!
*/

import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import express from 'express';
import rateLimit from 'express-rate-limit';
import MongoStore from 'rate-limit-mongo';
import path from 'path';
import mongoose from 'mongoose';
import { webhooks } from './models/webhooks';
import { requests } from './models/requests';
import bodyParser from 'body-parser';

const Axios = axios.create({
    headers: {
        Via: "HyraWebhookProxy/2.0"
    }
})

const app = express();

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

const windowMs = 1 * 60 * 1000;
const maxPerWindow = 30;

const limiter = rateLimit({
    store: new MongoStore({
        uri: process.env.MONGO_URI as string,
        collectionName: 'ratelimits',
        expireTimeMs: windowMs
    }),
    windowMs: windowMs,
    max: maxPerWindow,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).send({
            message: "You are being rate limited",
            retry_after: req.rateLimit.resetTime.getTime() - new Date().getTime()
        })
    },
    keyGenerator: (req) => {
        return req.params.id;
    }
});

const handleCounter = (req: express.Request) => {
    webhooks.findByIdAndUpdate(req.params.id, {
        $inc: {
            count: 1
        }
    }, { upsert: true }).exec();
}

const handleResponse = async(req: express.Request, res: express.Response, result: any) => {
    const log = await requests.create({
        webhook_id: req.params.id,
        status: result.status,
        method: req.method,
        // Allow us to help customer debug issues
        debug: result.status >= 200 && result.status < 300 ? undefined : {
            request_headers: req.headers,
            response_headers: result.headers,
            response_body: result.data,
            request_body: req.body
        }
    })

    res.setHeader("X-Request-ID", log._id);
    res.send(result.data);
}

app.get("/", (req, res) => {
    webhooks.find({}).then(result => {
        let total = 0;
        result.forEach(element => {
            total += element.count;
        });

        res.render("pages/index", {
            length: result.length,
            total: total
        });
    })
})

app.get("/api/webhooks/:id/:token", limiter, (req, res) => {
    handleCounter(req);
    Axios.get(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}`).then(result => {
        handleResponse(req, res, result);
    }).catch(err => {
        res.status(err.response.status);
        handleResponse(req, res, err.response);
    })
})

app.post("/api/webhooks/:id/:token", limiter, (req, res) => {
    handleCounter(req);
    Axios.post(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}`, req.body).then(result => {
        handleResponse(req, res, result);
    }).catch(err => {
        res.status(err.response.status);
        handleResponse(req, res, err.response);
    })
})

app.patch("/api/webhooks/:id/:token/messages/:messageId", limiter, (req, res) => {
    handleCounter(req);
    Axios.patch(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}/messages/${req.params.messageId}`, req.body).then(result => {
        handleResponse(req, res, result);
    }).catch(err => {
        res.status(err.response.status);
        handleResponse(req, res, err.response);
    })
})

app.delete("/api/webhooks/:id/:token/messages/:messageId", limiter, (req, res) => {
    handleCounter(req);
    Axios.delete(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}/messages/${req.params.messageId}`).then(result => {
        handleResponse(req, res, result);
    }).catch(err => {
        res.status(err.response.status);
        handleResponse(req, res, err.response);
    })
})

app.post("/api/webhooks/:id/:token/slack", limiter, (req, res) => {
    handleCounter(req);
    Axios.post(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}/slack`, req.body).then(result => {
        handleResponse(req, res, result);
    }).catch(err => {
        res.status(err.response.status);
        handleResponse(req, res, err.response);
    })
})

app.post("/api/webhooks/:id/:token/github", limiter, (req, res) => {
    handleCounter(req);
    Axios.post(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}/github`, req.body).then(result => {
        handleResponse(req, res, result);
    }).catch(err => {
        res.status(err.response.status);
        handleResponse(req, res, err.response);
    })
})

mongoose.connect(process.env.MONGO_URI as string).then(() => {
    app.listen(7053, () => {
        console.log("🙌 Listening for Requests")
    })
})
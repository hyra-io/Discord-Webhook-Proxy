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

import axios, { AxiosInstance } from 'axios';
import express from 'express';
import rateLimit from 'express-rate-limit';
import MongoStore from 'rate-limit-mongo';
import path from 'path';
import mongoose from 'mongoose';
import { webhooks } from './models/webhooks';
import { requests } from './models/requests';
import bodyParser from 'body-parser';
import { monitoring } from './routes/monitor';
import { networkInterfaces, hostname } from 'os';
import https from 'https';
import { caches } from './models/cache';

/*
    To allow us to send a larger volume of requests, we need to attach multiple IP
    addresses to our instances.

    In most cases, users will have 1 local IP address attached to their machine

    However, in Hyra's production environment, we have multiple IP addresses,
    so it we need to discover the IP addresses and then 'round-robin' the load.

    This is a pretty simple implementation of this. 

    More IP addresses will be discovered if they are attached to the instance using
    netplan.
*/
const nets = networkInterfaces();
const addresses = [];

// Discover the IP addresses
for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
        if (net.family === 'IPv4' && !net.internal) {
            addresses.push(net.address);
        }
    }
}

const axiosInstances: AxiosInstance[] = []

// Create an axios instance for each IP address
for (let address of addresses) {
    axiosInstances.push(axios.create({
        httpsAgent: new https.Agent({
            localAddress: address
        }),
        headers: {
            Via: "HyraWebhookProxy/2.0"
        }
    }))
}

// Balance the load across the instances by taking it in turns
let instance = 0;

const roundRobinInstance = (): { instance: AxiosInstance, id: number } => {
    if (instance === axiosInstances.length - 1) {
        instance = 0;
        return { instance: axiosInstances[instance], id: instance + 1 };
    } else {
        instance++;
        return { instance: axiosInstances[instance - 1], id: instance };
    }
}

// End of IP balancing

const app = express();

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 3600000
}))

app.use(bodyParser.json({ limit: '8mb' }));
app.use(bodyParser.urlencoded({ limit: '8mb' }));

app.use((req, res, next) => {
    res.header("X-Powered-By", "HyraWebhookProxy/2.0");
    next();
})

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

const globalLimiter = rateLimit({
    store: new MongoStore({
        uri: process.env.MONGO_URI as string,
        collectionName: 'ratelimits_global',
        expireTimeMs: 60 * 60 * 1000,
    }),
    windowMs: 60 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).send({
            message: "You are being rate limited",
            retry_after: req.rateLimit.resetTime.getTime() - new Date().getTime()
        })
    },
    keyGenerator: (req) => {
        return req.headers['roblox-id'] as string || req.headers['x-forwarded-for'] as string || req.ip;
    }
});

app.use("/api/webhooks/:id/:token", globalLimiter);

const handleCounter = (req: express.Request) => {
    webhooks.findByIdAndUpdate(req.params.id, {
        $inc: {
            count: 1
        }
    }, { upsert: true }).exec();
}

const validateRequest = (req: express.Request, res: express.Response) => {
    if (req.body) {
        if (req.body.content !== undefined && req.body.content.length === 0 && (req.body.embeds === undefined || req.body.embeds.length === 0)) {
            res.status(400).send({
                message: "Cannot send an empty message",
                code: 50006
            })
            return false;
        } if (req.body.content !== undefined && req.body.content.length > 2000) {
            res.status(400).send({
                message: "Content must be 2000 or fewer in length."
            })
            return false;
        } else if (req.body.embeds !== undefined && !Array.isArray(req.body.embeds)) {
            res.status(400).send({
                message: "Embeds must be a valid array of objects",
                code: 50006
            })
            return false;
        } else if (req.body.embeds !== undefined && req.body.embeds.length === 0) {
            res.status(400).send({
                message: "Cannot send an empty message",
                code: 50006
            })
            return false;
        } else if(req.body.embeds !== undefined && req.body.embeds.length) {
            for (let embed of req.body.embeds) {
                if(embed.author && embed.author.icon_url && !embed.author.icon_url.includes("http")) {
                    res.status(400).send({
                        message: "Invalid Embed Author Icon URL",
                    })
                    return false;
                }

                if(embed.fields) {
                    for(let field of embed.fields) {
                        if(!field.name || field.value === undefined) {
                            res.status(400).send({
                                message: "Embed fields must have a name and value",
                                code: 50007
                            })
                            return false;
                        }
                        if(field.name.length > 256) {
                            res.status(400).send({
                                message: "Embed field names must be 256 or fewer in length."
                            })
                            return false;
                        }
                        if(field.value.length > 1024) {
                            res.status(400).send({
                                message: "Embed field values must be 1024 or fewer in length."
                            })
                            return false;
                        }
                    }
                }
            }

            return true;
        } else if(!req.body.embeds && typeof(req.body.content) === 'string' && (req.body.content as string).trim() === "") {
            res.status(400).send({
                message: "Cannot send an empty message",
                code: 50006
            })
            return false;
        } else if (!req.body.content && !req.body.embeds) {
            res.status(400).send({
                message: "Cannot send an empty message",
                code: 50006
            })
            return false;
        } else {
            return true;
        }
    } else {
        res.status(400).send({
            _misc: "Expected \"Content-Type\" header to be one of {'application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'}."
        })

        return false;
    }
}

const handleResponse = async (req: express.Request, res: express.Response, result: any) => {
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

    // if (result.status === 429) {
    //     caches.findByIdAndUpdate(req.params.id, {
    //         message: "Ratelimit Exceeded - Your webhook has been suspended",
    //         response_code: 429,
    //     }, { upsert: true }).exec();
    // }

    res.setHeader("X-Request-ID", log._id);
    res.send(result.data);
}

if (process.env.MONITOR_SECRET) {
    app.use("/monitor", monitoring);
}

let uptimeMemCache = 100;

requests.deleteMany({}).then(() => {
    console.log("🗑️ Cleared Requests")
})

app.get("/", async (req, res) => {
    const requests = await webhooks.aggregate([
        {
            $group: {
                _id: null,
                count: { $sum: "$count" },
                total: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                count: 1,
                total: 1
            }
        }
    ])

    res.render("pages/index", {
        total: requests[0].count,
        length: requests[0].total,
        uptime: uptimeMemCache.toFixed(2) || 1000
    })
})

app.get("/api/webhooks/:id/:token", limiter, (req, res) => {
    caches.findById(req.params.id).then(result => {
        if (result) {
            res.setHeader("cache-control", "public, max-age=3600, must-revalidate");
            res.status(result.response_code).send({
                message: result.message
            })
        } else {
            handleCounter(req);
            const { instance, id } = roundRobinInstance();

            res.setHeader("X-Hyra-Machine-ID", hostname + "-" + id)
            instance.get(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}`).then(result => {
                handleResponse(req, res, result);
            }).catch(err => {
                if (err.response.status === 404) {
                    caches.findByIdAndUpdate(req.params.id, {
                        message: err.response.data.message,
                        response_code: err.response.status
                    }, { upsert: true }).exec();
                    res.setHeader("cache-control", "public, max-age=3600, must-revalidate");
                }
                res.status(err.response.status);
                handleResponse(req, res, err.response);
            })
        }
    })
})

app.post("/api/webhooks/:id/:token", limiter, (req, res) => {
    caches.findById(req.params.id).then(result => {
        if (result) {
            res.setHeader("cache-control", "public, max-age=3600, must-revalidate");
            res.status(result.response_code).send({
                message: result.message
            })
        } else if (validateRequest(req, res)) {
            handleCounter(req);
            const { instance, id } = roundRobinInstance();

            res.setHeader("X-Hyra-Machine-ID", hostname + "-" + id)
            instance.post(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}`, req.body).then(result => {
                handleResponse(req, res, result);
            }).catch(err => {
                if (err.response.status === 404) {
                    caches.findByIdAndUpdate(req.params.id, {
                        message: err.response.data.message,
                        response_code: err.response.status
                    }, { upsert: true }).exec();
                    res.setHeader("cache-control", "public, max-age=3600, must-revalidate");
                }

                res.status(err.response.status);
                handleResponse(req, res, err.response);
            })
        }
    })
})

app.patch("/api/webhooks/:id/:token/messages/:messageId", limiter, (req, res) => {
    caches.findById(req.params.id).then(result => {
        if (result) {
            res.setHeader("cache-control", "public, max-age=3600, must-revalidate");
            res.status(result.response_code).send({
                message: result.message
            })
        } else if (validateRequest(req, res)) {
            handleCounter(req);
            const { instance, id } = roundRobinInstance();

            res.setHeader("X-Hyra-Machine-ID", hostname + "-" + id)
            instance.patch(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}/messages/${req.params.messageId}`, req.body).then(result => {
                handleResponse(req, res, result);
            }).catch(err => {
                if (err.response.status === 404) {
                    caches.findByIdAndUpdate(req.params.id, {
                        message: err.response.data.message,
                        response_code: err.response.status
                    }, { upsert: true }).exec();
                    res.setHeader("cache-control", "public, max-age=3600, must-revalidate");
                }
                res.status(err.response.status);
                handleResponse(req, res, err.response);
            })
        }
    })
})

app.delete("/api/webhooks/:id/:token/messages/:messageId", limiter, (req, res) => {
    caches.findById(req.params.id).then(result => {
        if (result) {
            res.setHeader("cache-control", "public, max-age=3600, must-revalidate");
            res.status(result.response_code).send({
                message: result.message
            })
        } else {
            handleCounter(req);
            const { instance, id } = roundRobinInstance();

            res.setHeader("X-Hyra-Machine-ID", hostname + "-" + id)
            instance.delete(`https://discord.com/api/webhooks/${req.params.id}/${req.params.token}/messages/${req.params.messageId}`).then(result => {
                handleResponse(req, res, result);
            }).catch(err => {
                if (err.response.status === 404) {
                    caches.findByIdAndUpdate(req.params.id, {
                        message: err.response.data.message,
                        response_code: err.response.status
                    }, { upsert: true }).exec();
                    res.setHeader("cache-control", "public, max-age=3600, must-revalidate");
                }
                res.status(err.response.status);
                handleResponse(req, res, err.response);
            })
        }
    })

})

mongoose.connect(process.env.MONGO_URI as string).then(() => {
    app.listen(7053, () => {
        console.log("🙌 Listening for Requests")
    })
})
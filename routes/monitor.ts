import express from 'express';
import { requests } from '../models/requests';
const app = express.Router();

const allowAllCors = (req: express.Request, res: express.Response, next: any) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
}

app.get("/hour", allowAllCors, async (req, res) => {
    const total = await requests.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: new Date(Date.now() - 60000)
                }
            }
        },
        {
            $group: {
                _id: null,
                count: {
                    $sum: 1
                }
            }
        },
        {
            $project: {
                _id: 0,
                count: 1
            }
        },
    ])
    const successful = await requests.aggregate([
        {
            $match: {
                status: {
                    $gte: 200,
                    $lt: 300
                },
                createdAt: {
                    $gte: new Date(Date.now() - 60000)
                }
            }
        },
        {
            $group: {
                _id: null,
                count: {
                    $sum: 1
                }
            }
        },
        {
            $project: {
                _id: 0,
                count: 1
            }
        },
    ])

    res.send({
        total: total.length ? total[0].count : 0,
        successful: successful.length ? successful[0].count : 0
    })
})

app.get("/rps", (allowAllCors), (req, res) => {
    // count all requests from last minute
    requests.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: new Date(Date.now() - 60000)
                }
            }
        },
        {
            $group: {
                _id: null,
                count: {
                    $sum: 1
                }
            }
        },
        {
            $project: {
                _id: 0,
                count: 1
            }
        },
    ]).then(result => {
        res.send({
            rps: result.length ? result[0].count / 60 : 0
        })
    })
})

app.get("/failure", allowAllCors, (req, res) => {
    requests.aggregate([
        {
            $match: {
                status: {
                    $gte: 400,
                    $lt: 500
                },
                createdAt: {
                    $gte: new Date(Date.now() - 60000)
                }
            }
        },
        {
            $group: {
                _id: "$status",
                count: {
                    $sum: 1
                }
            }
        },
        {
            $sort: {
                count: -1
            }
        },
        {
            $limit: 10
        },
        {
            $project: {
                _id: 0,
                status: "$_id",
                count: 1
            }
        }
    ]).then(result => {
        res.send(result);
    })
})

export const monitoring = app;
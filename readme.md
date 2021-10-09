![Hyra](https://uploads-ssl.webflow.com/5f4e7c93c41edfe1f348daf3/5f4e82aeb6d6cf9e9eddb44e_Asset%202.png)

![Contributors](https://shields.io/github/contributors/hyra-io/Discord-Webhook-Proxy)
![License](https://shields.io/github/license/hyra-io/Discord-Webhook-Proxy)
![Language](https://shields.io/github/languages/top/hyra-io/Discord-Webhook-Proxy)

# Discord Webhook Proxy
This is a lightweight Discord Webhook Proxy written in Node.js. This proxy takes input and proxies it through the server running the code. This code was designed to be used to send requests to the Discord webhook API from Roblox.

MongoDB is being used in this project to store the ratelimit statuses. We cannot store this in memory in our hosted operation because it is hosted across several servers and load-balanced between them. 

## Installation
There are a few prerequisites to run this project locally. You'll need:
* Node.js - this was built using Node.js v16.7
* A MongoDb Instance - we run a cluster, store these credentials in a `.env` file, see the **Secrets** section for more guidance on your `.env` file. 
* All the dependencies in the package.json

Clone the repo to your system

To install the dependencies simply run `npm install`.

You'll then need to set up your environment variables. 

## Operation
Once you've installed the proxy, you'll need to run it. To run it, we'd recommend using a process manager like [pm2](https://pm2.io/). 

By default, the Express server connected to this system will run on port `7053`. We recommend running this behind a reverse proxy like NGINX. 

## Secrets
We store secrets in a `.env` file stored in the root directory of the project - you can't see this file because it's in our `.gitignore`.

Please see the format for this file below

```
MONGO_STRING=
MONGO_USER=
MONGO_PASSWORD=
MONGO_COLLECTION=
MONGO_AUTH_SOURCE=
```

## License
This project is licensed under [MIT License](LICENSE)

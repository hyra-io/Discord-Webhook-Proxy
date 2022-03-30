![Hyra](https://raw.githubusercontent.com/hyra-io/README/main/logo_png.png#gh-light-mode-only)
![Hyra](https://raw.githubusercontent.com/hyra-io/README/main/logo_png_white.png#gh-dark-mode-only)

![Contributors](https://shields.io/github/contributors/hyra-io/Discord-Webhook-Proxy)
![License](https://shields.io/github/license/hyra-io/Discord-Webhook-Proxy)
![Language](https://shields.io/github/languages/top/hyra-io/Discord-Webhook-Proxy)

# Discord Webhook Proxy
This a lightweight Discord Webhook Proxy designed for Roblox written in Typescript. This proxy takes input via HTTP and forwards it to Discord. To be in compliance with Discord Ratelimiting, a ratelimiting middleware is used to prevent spamming.

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

To use our predefined PM2 config, please simply execute
```bash
npm run pm2
```

This will recompile the Typescript and run it as a pm2 process.

By default, the Express server connected to this system will run on port `7053`. We recommend running this behind a reverse proxy like NGINX. 

When running, a landing page (powered by EJS) will be served at `http://localhost:7053/`.

## Monitoring
This comes bundled with a set of monitoring endpoints to allow you to monitor requests sent to your API. To enable these monitoring endpoints, you should generate a random string to be used as a passphrase and include it as the `MONITOR_SECRET` in your environment variables. 

These endpoints are available under `/monitor` and require the `Authorization` header on requests to be set to the value of your `MONITOR_SECRET` environment variable. 

## Secrets
We store secrets in a `.env` file stored in the root directory of the project - you can't see this file because it's in our `.gitignore`.

Please see the format for this file below

```
MONGO_URI=
MONITOR_SECRET=
```

## License
This project is licensed under [MIT License](LICENSE)

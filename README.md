# TanStack Start Demo

this demo shows off how to use (river)[https://github.com/bmdavis419/river] with tanstack start. there are two examples:

- question asker: fully resumable ai sdk agent with a tool call
- character classifier: a basic example of a custom stream

## this project uses:

- [river](https://github.com/bmdavis419/river)
- [tanstack start](https://tanstack.com/start)
- redis (whichever provider you prefer, upstash and railway are both great)
- [openrouter](https://openrouter.ai)
- [nuqs](https://nuqs.dev)
- [bun](https://bun.sh)
- [tailwindcss](https://tailwindcss.com)
- [ai sdk](https://sdk.vercel.ai)

## run this locally:

0. clone the repo, then `cd` into `tanstack-start-demo`

1. install deps: `bun i`

2. create a `.env.local` file and add the following env vars:

```.env.local
# railway and upstash are both great providers, or you can run it locally
REDIS_URL=redis://...

# get one from the openrouter dashboard
OPENROUTER_API_KEY=

# the password to protect your app
SECRET_APP_PASSWORD=my_very_secure_password

# session cookie password
SESSION_PASSWORD=something_really_long_and_weird_and_probably_should_be_generated_idk
```

3. start the dev server: `bun dev`

4. test it out at: http://localhost:3000

## deploy to railway:

used railway as the deployment example here because you can also setup a redis instance with private networking right next to it which is really convenient and it's stupid fast

0. create a railway account (if you don't have one) and then make a new project

1. create a new railway project in the dashboard, and then create the following resources:
   - a redis instance
   - an empty service

2. add your env vars to the empty service you just created. make sure to use the private redis url for your redis url, the rest can just be what you have locally

3. install the railway cli (if you don't have it), then login https://docs.railway.com/guides/cli

4. link this project to a railway project: `bun run link` (script just calls `railway link`)

5. deploy the project to railway: `bun run deploy` (script just calls `railway up`)

6. generate a domain for your project to access it in the railway dashboard (under service settings)

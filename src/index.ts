import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { MikroORM } from '@mikro-orm/core';
import microConfig from './mikro-orm.config';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { HelloResolver } from './resolvers/hello';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import { createClient } from "redis"
import session from 'express-session';
import RedisStore from 'connect-redis';
import { __prod__ } from './constants';
import { MyContext } from './types';

dotenv.config();

declare module 'express-session' {
    export interface SessionData {
      userId: number;
    }
}

const main = async () => {
    const orm = await MikroORM.init(microConfig);
    await orm.getMigrator().up();
    
    const app = express();

    app.set("trust proxy", true);

    const cors = { credentials: true, origin: 'http://localhost:3000', allowedHeaders:'Content-Type,Authorization' }

    const redisClient = createClient();
    redisClient.connect().catch(console.error);

    let redisStore = new RedisStore({
        client: redisClient,
        prefix: 'myapp',
        disableTouch: true,
    })

    app.use(
        session({
            name: 'qid',
            store: redisStore as any,
            secret: "fjiowejfiowjeflkefwwef",
            saveUninitialized: false,
            resave: false,
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
                httpOnly: true,
                sameSite: 'lax',
                secure: false, // cookie only works in https
            },
        })
    );

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false,
        }),
        persistedQueries: false,
        context: ({req, res}): MyContext => ({ em: orm.em, req, res }),
    });

    await apolloServer.start();
    apolloServer.applyMiddleware({ app, cors });

    app.get('/', (_, res) => {
        res.send('hello');
    })
    app.listen(4000, () => {
        console.log('Server started on localhost:4000');
    })
}

main();
